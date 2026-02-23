// File: controllers/returnsController.js
const db = require('../config/database');

// ✅ Auto-migrate: add missing columns to returns_exchanges if they don't exist
(async () => {
  try {
    // Add admin_notes column
    try {
      const [cols] = await db.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returns_exchanges' AND COLUMN_NAME = 'admin_notes'`
      );
      if (cols.length === 0) {
        await db.execute(`ALTER TABLE returns_exchanges ADD COLUMN admin_notes TEXT NULL`);
        console.log('✅ Added admin_notes column to returns_exchanges');
      } else {
        console.log('✅ returns_exchanges.admin_notes column already exists');
      }
    } catch (e) {
      console.warn('⚠️ Could not check/add admin_notes column:', e.message);
    }

    // Add updated_at column
    try {
      const [cols2] = await db.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'returns_exchanges' AND COLUMN_NAME = 'updated_at'`
      );
      if (cols2.length === 0) {
        await db.execute(`ALTER TABLE returns_exchanges ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        console.log('✅ Added updated_at column to returns_exchanges');
      }
    } catch (e) {
      console.warn('⚠️ Could not check/add updated_at column:', e.message);
    }

    // ✅ Fix: Update status ENUM to include all values
    try {
      await db.execute(`
            ALTER TABLE returns_exchanges 
            MODIFY COLUMN status ENUM('requested', 'approved', 'rejected', 'processing', 'completed', 'cancelled') 
            DEFAULT 'requested'
        `);
      console.log('✅ Updated returns_exchanges status ENUM');
    } catch (e) {
      console.warn('⚠️ Could not update status ENUM:', e.message);
    }

  } catch (err) {
    console.warn('⚠️ Auto-migration warning:', err.message);
  }
})();

// @desc    Create return/exchange request
// @route   POST /api/orders/returns
// @access  Private
const createReturnRequest = async (req, res) => {
  try {
    const { order_id, type, items, description } = req.body;
    const user_id = req.user.id;

    console.log('🔄 Creating return request:', { order_id, type, user_id, items });

    // Validation
    if (!order_id || !type || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, type, and items are required'
      });
    }

    // Get the logged-in user's email
    const [users] = await db.execute('SELECT email FROM users WHERE id = ?', [user_id]);
    const userEmail = users[0]?.email;

    // Check if order exists and belongs to user (by user_id OR by customer_email)
    const [orders] = await db.execute(
      'SELECT * FROM orders WHERE id = ? AND (user_id = ? OR customer_email = ?)',
      [order_id, user_id, userEmail]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to you'
      });
    }

    const order = orders[0];

    // Check if order can be returned (within 30 days of delivery)
    const deliveryDate = new Date(order.delivered_at || order.created_at);
    const returnDeadline = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (new Date() > returnDeadline) {
      return res.status(400).json({
        success: false,
        message: 'Return period has expired (30 days from delivery)'
      });
    }

    // Check if items belong to the order
    for (const item of items) {
      const [orderItems] = await db.execute(
        'SELECT * FROM order_items WHERE id = ? AND order_id = ?',
        [item.order_item_id, order_id]
      );

      if (orderItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${item.order_item_id} does not belong to order ${order_id}`
        });
      }
    }

    // Calculate refund amount
    let refund_amount = 0;
    for (const item of items) {
      const [orderItems] = await db.execute(
        'SELECT price, quantity FROM order_items WHERE id = ?',
        [item.order_item_id]
      );
      refund_amount += orderItems[0].price * item.quantity;
    }

    // Create return request
    const [result] = await db.execute(
      'INSERT INTO returns_exchanges (order_id, user_id, type, reason, description, refund_amount) VALUES (?, ?, ?, ?, ?, ?)',
      [order_id, user_id, type, items[0].reason, description, refund_amount]
    );

    const return_id = result.insertId;

    // Add return items
    for (const item of items) {
      await db.execute(
        'INSERT INTO return_items (return_id, order_item_id, product_id, quantity, reason) VALUES (?, ?, ?, ?, ?)',
        [return_id, item.order_item_id, item.product_id, item.quantity, item.reason]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully',
      return_id: return_id
    });

  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create return request: ' + error.message
    });
  }
};

// @desc    Get user's return requests
// @route   GET /api/orders/returns/user
// @access  Private
const getUserReturns = async (req, res) => {
  try {
    const user_id = req.user.id;

    const [returns] = await db.execute(
      `SELECT re.*, o.total_amount, o.order_status,
              COUNT(ri.id) as item_count,
              SUM(ri.quantity) as total_quantity
       FROM returns_exchanges re
       LEFT JOIN orders o ON re.order_id = o.id
       LEFT JOIN return_items ri ON re.id = ri.return_id
       WHERE re.user_id = ?
       GROUP BY re.id
       ORDER BY re.created_at DESC`,
      [user_id]
    );

    res.json({
      success: true,
      returns: returns
    });

  } catch (error) {
    console.error('Get user returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch return requests: ' + error.message
    });
  }
};

// @desc    Get return request details
// @route   GET /api/orders/returns/:id
// @access  Private
const getReturnDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Get return basic info
    const [returns] = await db.execute(
      `SELECT re.*, o.total_amount, o.order_status, o.customer_name, o.customer_email
       FROM returns_exchanges re
       JOIN orders o ON re.order_id = o.id
       WHERE re.id = ? AND re.user_id = ?`,
      [id, user_id]
    );

    if (returns.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    // Get return items
    const [items] = await db.execute(
      `SELECT ri.*, oi.product_name, oi.product_id, oi.price, oi.image,
              p.name as current_product_name, p.image as current_product_image
       FROM return_items ri
       JOIN order_items oi ON ri.order_item_id = oi.id
       LEFT JOIN products p ON ri.product_id = p.id
       WHERE ri.return_id = ?`,
      [id]
    );

    res.json({
      success: true,
      return: {
        ...returns[0],
        items: items
      }
    });

  } catch (error) {
    console.error('Get return details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch return details: ' + error.message
    });
  }
};

// @desc    Cancel return request
// @route   PUT /api/orders/returns/:id/cancel
// @access  Private
const cancelReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if return exists and belongs to user
    const [returns] = await db.execute(
      'SELECT * FROM returns_exchanges WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    if (returns.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    const returnRequest = returns[0];

    // Check if can be cancelled
    if (!['requested', 'approved'].includes(returnRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Return request cannot be cancelled at this stage'
      });
    }

    // Update status
    await db.execute(
      'UPDATE returns_exchanges SET status = "cancelled" WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Return request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel return request: ' + error.message
    });
  }
};

// @desc    Get all returns (Admin)
// @route   GET /api/orders/admin/returns
// @access  Private/Admin
const getAllReturns = async (req, res) => {
  try {
    const [returns] = await db.execute(
      `SELECT re.*, u.name as user_name, u.email as user_email,
              o.total_amount, o.order_status,
              COUNT(ri.id) as item_count
       FROM returns_exchanges re
       JOIN users u ON re.user_id = u.id
       JOIN orders o ON re.order_id = o.id
       LEFT JOIN return_items ri ON re.id = ri.return_id
       GROUP BY re.id
       ORDER BY re.created_at DESC`
    );

    res.json({
      success: true,
      returns: returns
    });

  } catch (error) {
    console.error('Get all returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch returns: ' + error.message
    });
  }
};

// @desc    Update return status (Admin)
// @route   PUT /api/orders/admin/returns/:id/status
// @access  Private/Admin
const updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    console.log('✏️ Updating return status:', { id, status });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['requested', 'approved', 'rejected', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update return status - build query dynamically
    let updateQuery = 'UPDATE returns_exchanges SET status = ?';
    const queryParams = [status];

    if (admin_notes !== undefined && admin_notes !== null) {
      updateQuery += ', admin_notes = ?';
      queryParams.push(admin_notes);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(id);

    try {
      const [result] = await db.execute(updateQuery, queryParams);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Return request not found'
        });
      }

      res.json({
        success: true,
        message: 'Return status updated successfully'
      });
    } catch (dbError) {
      // 🚨 AUTO-FIX: Create admin_notes column if missing
      if (dbError.code === 'ER_BAD_FIELD_ERROR' && dbError.sqlMessage.includes("Unknown column 'admin_notes'")) {
        console.warn('⚠️ admin_notes column missing. Creating it now...');
        await db.execute('ALTER TABLE returns_exchanges ADD COLUMN admin_notes TEXT NULL');

        // Retry the update
        const [retryResult] = await db.execute(updateQuery, queryParams);

        if (retryResult.affectedRows === 0) {
          return res.status(404).json({
            success: false,
            message: 'Return request not found'
          });
        }

        return res.json({
          success: true,
          message: 'Return status updated successfully (and column created)'
        });
      }

      // Rethrow if different error
      throw dbError;
    }

  } catch (error) {
    console.error('Update return status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update return status: ' + error.message
    });
  }
};

// @desc    Get return status for a specific order (public - by order_id + email)
// @route   GET /api/returns/order/:orderId?email=xxx
// @access  Public
const getReturnByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Verify the order belongs to this email (guest or registered)
    const [orders] = await db.execute(
      'SELECT id FROM orders WHERE id = ? AND customer_email = ?',
      [orderId, email]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Get return request for this order
    const [returns] = await db.execute(
      `SELECT re.id, re.type, re.status, re.reason, re.description,
              re.refund_amount, re.admin_notes, re.created_at, re.updated_at,
              COUNT(ri.id) as item_count
       FROM returns_exchanges re
       LEFT JOIN return_items ri ON re.id = ri.return_id
       WHERE re.order_id = ?
       GROUP BY re.id
       ORDER BY re.created_at DESC
       LIMIT 1`,
      [orderId]
    );

    if (returns.length === 0) {
      return res.json({ success: true, return: null });
    }

    res.json({ success: true, return: returns[0] });

  } catch (error) {
    console.error('Get return by order error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch return status' });
  }
};

// @desc    Get return status for a specific order (authenticated user)
// @route   GET /api/returns/my-order/:orderId
// @access  Private
const getReturnByOrderAuth = async (req, res) => {
  try {
    const { orderId } = req.params;
    const user_id = req.user.id;

    // Get the user's email
    const [users] = await db.execute('SELECT email FROM users WHERE id = ?', [user_id]);
    const userEmail = users[0]?.email;

    // Verify the order belongs to this user (by user_id OR email)
    const [orders] = await db.execute(
      'SELECT id FROM orders WHERE id = ? AND (user_id = ? OR customer_email = ?)',
      [orderId, user_id, userEmail]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Get return request for this order
    const [returns] = await db.execute(
      `SELECT re.id, re.type, re.status, re.reason, re.description,
              re.refund_amount, re.admin_notes, re.created_at, re.updated_at,
              COUNT(ri.id) as item_count
       FROM returns_exchanges re
       LEFT JOIN return_items ri ON re.id = ri.return_id
       WHERE re.order_id = ?
       GROUP BY re.id
       ORDER BY re.created_at DESC
       LIMIT 1`,
      [orderId]
    );

    if (returns.length === 0) {
      return res.json({ success: true, return: null });
    }

    res.json({ success: true, return: returns[0] });

  } catch (error) {
    console.error('Get return by order (auth) error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch return status' });
  }
};

module.exports = {
  createReturnRequest,
  getUserReturns,
  getReturnDetails,
  cancelReturnRequest,
  getAllReturns,
  updateReturnStatus,
  getReturnByOrder,
  getReturnByOrderAuth
};

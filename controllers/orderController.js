// File: server/controllers/orderController.js - COMPLETE FIXED VERSION
const Order = require('../models/Order');
const { sendOrderConfirmation } = require('../services/emailService');
const db = require('../config/database');

// Helper function to format date for display
const formatDateForDisplay = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  // ✅ START TRANSACTION
  await db.query('START TRANSACTION');

  try {
    console.log('🔄 Creating new order...');
    console.log('📦 Order data:', req.body);

    const {
      items,
      shipping_address,
      customer_name,
      customer_email,
      customer_phone,
      total_amount,
      payment_method,
      payment_status
    } = req.body;

    // Basic validation
    if (!items || !items.length) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Order items are required'
      });
    }

    if (!shipping_address || !customer_name || !customer_email) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Shipping address, customer name, and email are required'
      });
    }

    // ✅ CRITICAL: STOCK VALIDATION - Check BEFORE creating order
    console.log('🔍 Checking stock for all items...');

    // Check each item's stock availability
    for (const item of items) {
      const [productRows] = await db.execute(
        'SELECT id, name, stock, category_id FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (productRows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Product "${item.product_name}" not found`
        });
      }

      const product = productRows[0];

      // ✅ CHECK 1: Is product out of stock?
      if (product.stock === 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `"${product.name}" is out of stock. Please remove from cart.`
        });
      }

      // ✅ CHECK 2: Is requested quantity available?
      if (product.stock < item.quantity) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      console.log(`✅ Stock available: ${product.name} - Stock: ${product.stock}, Needed: ${item.quantity}`);
    }

    console.log('✅ All items have sufficient stock');

    // ✅ UPDATE STOCK & SALES STATS - FIX FOR DASHBOARD!
    console.log('📊 Updating stock & sales statistics...');

    // Calculate total items quantity for order stats
    const totalItemsQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const finalTotalAmount = parseFloat(total_amount) || 0; // ✅ FIXED!

    for (const item of items) {
      const itemPrice = parseFloat(item.price) || 0;
      const itemRevenue = itemPrice * item.quantity;

      // 1. Update stock AND sales stats together
      const [updateResult] = await db.execute(`
        UPDATE products 
        SET 
          stock = stock - ?,
          total_sold = total_sold + ?,
          total_revenue = total_revenue + ?,
          last_sold_date = NOW()
        WHERE id = ? AND stock >= ?
      `, [item.quantity, item.quantity, itemRevenue, item.product_id, item.quantity]);

      if (updateResult.affectedRows === 0) {
        await db.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Stock update failed for ${item.product_name}. It may have gone out of stock.`
        });
      }

      console.log(`✅ Product ${item.product_id}: Stock -${item.quantity}, Sold +${item.quantity}, Revenue +₹${itemRevenue}`);

      // 2. Update category sales stats
      await db.execute(`
        UPDATE categories c
        JOIN products p ON c.id = p.category_id
        SET 
          c.total_sales = c.total_sales + ?,
          c.items_sold = c.items_sold + ?
        WHERE p.id = ?
      `, [itemRevenue, item.quantity, item.product_id]);

      console.log(`✅ Category stats updated for product ${item.product_id}`);
    }

    // ✅ COMPLETE AUTO-GENERATE ALL DATES FOR DB STORAGE
    console.log('📅 Generating COMPLETE delivery timeline...');
    const orderDate = new Date(); // Current time

    // 1. Tracking Number
    const generateTrackingNumber = () => {
      const prefix = 'TRK';
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${prefix}${timestamp}${random}`;
    };

    const trackingNumber = generateTrackingNumber();
    console.log('📦 Generated tracking number:', trackingNumber);

    // 2. Expected Delivery Date (3-4 business days)
    const generateExpectedDeliveryDate = () => {
      const today = new Date();
      let deliveryDate = new Date(today);
      let businessDaysAdded = 0;

      // Add 3 business days minimum (skip weekends)
      while (businessDaysAdded < 3) {
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
          businessDaysAdded++;
        }
      }

      // Add 0-1 extra random business day for "3-4 business days"
      const addExtraDay = Math.random() > 0.5; // 50% chance
      if (addExtraDay) {
        let extraDate = new Date(deliveryDate);
        extraDate.setDate(extraDate.getDate() + 1);
        if (extraDate.getDay() !== 0 && extraDate.getDay() !== 6) {
          deliveryDate = extraDate;
        }
      }

      return deliveryDate.toISOString().split('T')[0];
    };

    const expectedDeliveryDate = generateExpectedDeliveryDate();

    // 3. Shipped Date (1 business day after order for COD/Prepaid)
    const generateShippedDate = () => {
      const shipped = new Date(orderDate);
      shipped.setDate(shipped.getDate() + 1); // 1 day after order

      // Skip weekend if falls on weekend
      if (shipped.getDay() === 0) shipped.setDate(shipped.getDate() + 1);
      if (shipped.getDay() === 6) shipped.setDate(shipped.getDate() + 2);

      return shipped;
    };

    const shippedDate = generateShippedDate();

    // 4. Delivered Date (2 business days after shipping)
    const generateDeliveredDate = () => {
      const delivered = new Date(shippedDate);
      delivered.setDate(delivered.getDate() + 2); // 2 days after shipping

      // Skip weekend if falls on weekend
      if (delivered.getDay() === 0) delivered.setDate(delivered.getDate() + 1);
      if (delivered.getDay() === 6) delivered.setDate(delivered.getDate() + 2);

      return delivered;
    };

    const deliveredDate = generateDeliveredDate();

    console.log('📊 Auto-generated dates for DB storage:', {
      tracking: trackingNumber,
      expected: expectedDeliveryDate,
      shipped: shippedDate.toISOString(),
      delivered: deliveredDate.toISOString()
    });

    // ✅ COMPLETE ORDER DATA WITH ALL AUTO-GENERATED DATES
    const orderData = {
      user_id: req.user?.id || null,
      items: items,
      shipping_address,
      customer_name,
      customer_email,
      customer_phone: customer_phone || '',
      total_amount: finalTotalAmount,
      payment_method: payment_method || 'cod',
      payment_status: payment_status || 'pending',
      tracking_number: trackingNumber,
      expected_delivery_date: expectedDeliveryDate,
      //shipped_at: shippedDate ? shippedDate.toISOString() : null, // ✅ Convert to string
      //delivered_at: deliveredDate ? deliveredDate.toISOString() : null // ✅ Convert to string
    };

    console.log('📝 Final order data:', orderData);

    // ✅ Pass data to Order.create
    const orderId = await Order.create(orderData);

    // Get created order with items
    const order = await Order.findById(orderId);

    // ✅ UPDATE DAILY ORDER STATISTICS FOR DASHBOARD
    const today = new Date().toISOString().split('T')[0];

    await db.execute(`
      INSERT INTO order_statistics (date, total_orders, total_sales, total_items_sold)
      VALUES (?, 1, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_orders = total_orders + 1,
        total_sales = total_sales + ?,
        total_items_sold = total_items_sold + ?,
        updated_at = NOW()
    `, [today, finalTotalAmount, totalItemsQuantity, finalTotalAmount, totalItemsQuantity]);

    console.log(`📈 Daily stats updated for ${today}: Orders +1, Sales +₹${finalTotalAmount}, Items +${totalItemsQuantity}`);

    // ✅ SEND ORDER CONFIRMATION EMAIL WITH TRACKING NUMBER
    try {
      await sendOrderConfirmation(order, {
        name: order.customer_name,
        email: order.customer_email,
        tracking_number: trackingNumber,
        expected_delivery_date: expectedDeliveryDate
      });
      console.log('📧 Order confirmation email sent');
    } catch (emailError) {
      console.error('❌ Email sending failed, but order was created:', emailError);
    }

    // ✅ COMMIT TRANSACTION
    await db.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Order placed successfully! Tracking: ${trackingNumber}, Expected delivery: ${formatDateForDisplay(expectedDeliveryDate)}`,
      order: order,
      tracking_number: trackingNumber,
      expected_delivery_date: expectedDeliveryDate,
      estimated_delivery: '3-4 business days'
    });

  } catch (error) {
    // ✅ ROLLBACK ON ERROR
    await db.query('ROLLBACK');

    console.error('❌ Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order: ' + error.message
    });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log(`📦 Fetching orders for user ID: ${userId}`);

    const [orders] = await db.execute(
      `SELECT 
        o.id,
        o.user_id,
        o.total_amount,
        o.order_status,
        o.payment_status,
        o.payment_method,
        o.shipping_address,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.tracking_number,
        o.expected_delivery_date,
        o.shipped_at,
        o.delivered_at,
        o.created_at
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.execute(
          `SELECT 
            oi.id,
            oi.product_id,
            oi.quantity,
            oi.price,
            oi.item_status,
            oi.image as item_image,
            p.name as product_name,
            p.image as product_image
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`,
          [order.id]
        );

        return {
          ...order,
          total_amount: parseFloat(order.total_amount) || 0,
          items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            image: item.item_image || item.product_image,  // ✅ FIX: Use item_image first, then product_image
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
            item_status: item.item_status || order.order_status
          }))
        };
      })
    );

    console.log(`✅ Found ${ordersWithItems.length} orders`);

    res.json({
      success: true,
      orders: ordersWithItems
    });

  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders: ' + error.message
    });
  }
};

// @desc    Get orders by customer email
// @route   GET /api/orders/customer/:email
// @access  Public
const getOrdersByCustomerEmail = async (req, res) => {
  try {
    const { email } = req.params;

    console.log('🔍 Fetching orders for customer:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const orders = await Order.findByCustomerEmail(email);

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this email'
      });
    }

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('❌ Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders: ' + error.message
    });
  }
};

// @desc    Track individual order item
// @route   GET /api/orders/:orderId/items/:itemId/track
// @access  Public
const trackOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { email } = req.query;

    console.log('🔍 Tracking order item:', { orderId, itemId, email });

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for tracking'
      });
    }

    // Get item with item_status
    const [items] = await db.execute(
      `SELECT oi.*, 
              o.customer_email, 
              o.order_status, 
              o.customer_name,
              o.tracking_number,
              o.expected_delivery_date,
              COALESCE(oi.item_status, o.order_status) as final_item_status
       FROM order_items oi
       LEFT JOIN orders o ON oi.order_id = o.id
       WHERE oi.order_id = ? AND oi.id = ? AND o.customer_email = ?`,
      [orderId, itemId, email]
    );

    if (!items || items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found or email mismatch'
      });
    }

    const item = items[0];

    res.json({
      success: true,
      item: {
        id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        tracking_id: item.tracking_id,
        tracking_url: item.tracking_url,
        order_tracking_number: item.tracking_number,
        expected_delivery_date: item.expected_delivery_date,
        item_status: item.final_item_status || item.order_status,
        order_status: item.order_status,
        customer_name: item.customer_name,
        estimated_delivery: calculateExpectedDelivery(item.final_item_status || item.order_status)
      }
    });

  } catch (error) {
    console.error('Track order item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking order item: ' + error.message
    });
  }
};

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    console.log('🔄 Cancelling order:', { id, cancellation_reason });

    // Start transaction
    await db.query('START TRANSACTION');

    try {
      // Update order status
      const [orderResult] = await db.execute(
        'UPDATE orders SET order_status = "cancelled", cancellation_reason = ?, updated_at = NOW() WHERE id = ?',
        [cancellation_reason || 'Customer requested', id]
      );

      if (orderResult.affectedRows === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // ✅ RESTORE STOCK WHEN ORDER IS CANCELLED
      const [orderItems] = await db.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      );

      // Restore stock for each item
      for (const item of orderItems) {
        const [stockResult] = await db.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
        console.log(`✅ Restored ${item.quantity} units stock for product ${item.product_id}`);
      }

      // Also update order items status
      const [itemsResult] = await db.execute(
        'UPDATE order_items SET item_status = "cancelled", updated_at = NOW() WHERE order_id = ?',
        [id]
      );

      console.log(`✅ Updated ${itemsResult.affectedRows} items to cancelled and restored stock`);

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Order cancelled successfully and stock restored'
      });

    } catch (transactionError) {
      await db.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order: ' + error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order: ' + error.message
    });
  }
};

// @desc    Track order by ID and email (Public) or by token (Private)
// @route   GET /api/orders/track/:id
// @access  Public (email) or Private (token)
const trackOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    console.log('🔍 Tracking order:', { id, email });

    // Check if user is authenticated via token
    let authenticatedUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        authenticatedUserId = decoded.id;
      } catch (err) {
        // Token invalid - fall through to email check
      }
    }

    // If not authenticated and no email, reject
    if (!authenticatedUserId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for order tracking'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify ownership
    if (authenticatedUserId) {
      // For logged-in users: check user_id OR email match
      const [users] = await db.execute('SELECT email FROM users WHERE id = ?', [authenticatedUserId]);
      const userEmail = users[0]?.email;
      if (order.user_id !== authenticatedUserId && order.customer_email !== userEmail) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this order'
        });
      }
    } else {
      // For guests: verify email matches order email
      if (order.customer_email !== email) {
        return res.status(403).json({
          success: false,
          message: 'Email does not match order records'
        });
      }
    }

    // ✅ Ensure each item has correct item_status
    if (order.items && order.items.length > 0) {
      order.items = order.items.map(item => ({
        ...item,
        item_status: item.item_status || order.order_status
      }));
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking order: ' + error.message
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    console.log('📡 [ADMIN] API CALL: /admin/orders - Fetching ALL orders...');
    console.log('👤 Admin user:', req.user?.id, req.user?.email);

    // Log the request
    console.log('📦 Request details:', {
      method: req.method,
      url: req.originalUrl,
      user_role: req.user?.role,
      user_id: req.user?.id
    });

    const orders = await Order.findAll();

    // 🔍 CRITICAL DEBUG: Check what we got from Order.findAll()
    console.log(`📊 [ADMIN] Got ${orders?.length || 0} orders from Order.findAll()`);

    if (orders && orders.length > 0) {
      const sampleOrder = orders[0];
      console.log('🔍 [ADMIN] Sample order #1 STRUCTURE:', {
        id: sampleOrder.id,
        order_status: sampleOrder.order_status,
        tracking_number: sampleOrder.tracking_number,
        // CHECK DATE FIELDS:
        expected_delivery_date: sampleOrder.expected_delivery_date,
        shipped_at: sampleOrder.shipped_at,
        delivered_at: sampleOrder.delivered_at,
        // Check if fields exist:
        has_expected: 'expected_delivery_date' in sampleOrder,
        has_shipped: 'shipped_at' in sampleOrder,
        has_delivered: 'delivered_at' in sampleOrder,
        // Check values:
        expected_value_type: typeof sampleOrder.expected_delivery_date,
        shipped_value_type: typeof sampleOrder.shipped_at,
        delivered_value_type: typeof sampleOrder.delivered_at
      });

      // Also check ALL keys
      console.log('🔑 [ADMIN] Sample order ALL KEYS:', Object.keys(sampleOrder));

      // Check a few more orders
      orders.slice(0, 3).forEach((order, index) => {
        console.log(`📋 [ADMIN] Order ${index + 1} (ID: ${order.id}):`, {
          status: order.order_status,
          tracking: order.tracking_number,
          expected: order.expected_delivery_date,
          shipped: order.shipped_at,
          delivered: order.delivered_at
        });
      });
    } else {
      console.log('⚠️ [ADMIN] No orders found or orders array is empty');
    }

    const response = {
      success: true,
      count: orders?.length || 0,
      orders: orders || []
    };

    console.log('✅ [ADMIN] Sending response:', {
      success: response.success,
      count: response.count,
      hasOrders: Array.isArray(response.orders) && response.orders.length > 0
    });

    res.json(response);

  } catch (error) {
    console.error('❌ [ADMIN] Get all orders error:', error);
    console.error('❌ [ADMIN] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};


// @desc    Update order status (Admin)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('✏️ Updating order status:', { id, status });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // ✅ START TRANSACTION
    await db.query('START TRANSACTION');

    try {
      // ✅ GET CURRENT ORDER DETAILS TO CHECK PAYMENT METHOD
      const [orderDetails] = await db.execute(
        'SELECT payment_method, payment_status FROM orders WHERE id = ?',
        [id]
      );

      if (orderDetails.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const currentOrder = orderDetails[0];

      // ✅ 1. UPDATE ORDER STATUS WITH TIMESTAMPS AND PAYMENT STATUS
      let updateQuery = 'UPDATE orders SET order_status = ?, updated_at = NOW()';
      const queryParams = [status];

      // Add timestamp updates based on status
      if (status === 'shipped') {
        updateQuery += ', shipped_at = NOW()';
      } else if (status === 'delivered') {
        updateQuery += ', delivered_at = NOW()';

        // ✅ FIX: Auto-update payment_status to 'paid' for COD orders when delivered
        if (currentOrder.payment_method === 'COD' || currentOrder.payment_method === 'cod') {
          updateQuery += ', payment_status = ?';
          queryParams.push('paid');
          console.log('💰 COD Order delivered - Auto-updating payment_status to PAID');
        }
      }

      updateQuery += ' WHERE id = ?';
      queryParams.push(id);

      const [orderResult] = await db.execute(updateQuery, queryParams);

      if (orderResult.affectedRows === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // ✅ 2. Update ALL order_items status
      const [itemsResult] = await db.execute(
        `UPDATE order_items 
         SET item_status = ?, updated_at = NOW()
         WHERE order_id = ?`,
        [status, id]
      );

      console.log(`✅ Updated ${itemsResult.affectedRows} items to status: ${status}`);

      // ✅ 3. RESTORE STOCK IF ORDER CANCELLED
      if (status === 'cancelled') {
        const [orderItems] = await db.execute(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
          [id]
        );

        for (const item of orderItems) {
          const [stockResult] = await db.execute(
            'UPDATE products SET stock = stock + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
          console.log(`✅ Restored ${item.quantity} units stock for product ${item.product_id}`);
        }
      }

      // 4. Commit transaction
      await db.query('COMMIT');

      // 5. Get updated order with items
      const order = await Order.findById(id);

      // Log the changes
      console.log(`🎯 Order #${id} updated to ${status}`);
      console.log('📅 Timestamps updated:', {
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at,
        payment_status: order.payment_status
      });

      // ✅ Response with payment status info
      const responseMessage = status === 'delivered' &&
        (currentOrder.payment_method === 'COD' || currentOrder.payment_method === 'cod')
        ? `Order delivered and payment status updated to PAID (COD received)`
        : `Order status updated to ${status}`;

      res.json({
        success: true,
        message: responseMessage,
        order: order,
        items_updated: itemsResult.affectedRows,
        payment_status_updated: status === 'delivered' &&
          (currentOrder.payment_method === 'COD' || currentOrder.payment_method === 'cod'),
        timestamps_updated: {
          shipped_at: status === 'shipped' ? 'SET' : 'NOT SET',
          delivered_at: status === 'delivered' ? 'SET' : 'NOT SET',
          payment_status: status === 'delivered' &&
            (currentOrder.payment_method === 'COD' || currentOrder.payment_method === 'cod')
            ? 'UPDATED TO PAID' : 'NO CHANGE'
        }
      });

    } catch (transactionError) {
      await db.query('ROLLBACK');
      console.error('Transaction failed:', transactionError);
      throw transactionError;
    }

  } catch (error) {
    console.error('❌ Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status: ' + error.message
    });
  }
};

// @desc    Manually set shipped/delivered dates (Admin) - FOR EXISTING ORDERS
// @route   PUT /api/admin/orders/:id/set-dates
// @access  Private/Admin
const manuallySetOrderDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { shipped_date, delivered_date } = req.body;

    console.log('📅 Manually setting dates for order:', { id, shipped_date, delivered_date });

    if (!shipped_date && !delivered_date) {
      return res.status(400).json({
        success: false,
        message: 'At least one date (shipped_date or delivered_date) is required'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (shipped_date) {
      updates.push('shipped_at = ?');
      values.push(shipped_date);
    }

    if (delivered_date) {
      updates.push('delivered_at = ?');
      values.push(delivered_date);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const [result] = await db.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get updated order
    const order = await Order.findById(id);

    res.json({
      success: true,
      message: 'Order dates updated successfully',
      order: {
        id: order.id,
        order_status: order.order_status,
        shipped_at: order.shipped_at,
        delivered_at: order.delivered_at
      }
    });

  } catch (error) {
    console.error('❌ Manually set dates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order dates: ' + error.message
    });
  }
};

// @desc    Update item tracking (Admin)
// @route   PUT /api/admin/orders/:orderId/items/:itemId/tracking
// @access  Private/Admin
const updateItemTracking = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { tracking_id, tracking_url, item_status } = req.body;

    console.log('✏️ Updating item tracking:', { orderId, itemId, tracking_id, tracking_url, item_status });

    const [result] = await db.execute(
      'UPDATE order_items SET tracking_id = ?, tracking_url = ?, item_status = ?, updated_at = NOW() WHERE id = ? AND order_id = ?',
      [tracking_id, tracking_url, item_status, itemId, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order item not found'
      });
    }

    res.json({
      success: true,
      message: 'Item tracking updated successfully'
    });

  } catch (error) {
    console.error('Update item tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update item tracking: ' + error.message
    });
  }
};

// @desc    Sync item status with order status (Admin - Emergency Fix)
// @route   POST /api/admin/orders/:id/sync-items
// @access  Private/Admin
const syncItemStatus = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔄 [SYNC ITEMS] Syncing item status for order:', id);

    // Get current order status
    const [orderRows] = await db.execute(
      'SELECT order_status FROM orders WHERE id = ?',
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const orderStatus = orderRows[0].order_status;

    // Get current items
    const [currentItems] = await db.execute(
      'SELECT id, item_status FROM order_items WHERE order_id = ?',
      [id]
    );

    console.log('📊 Current items before sync:', {
      order_status: orderStatus,
      items: currentItems.map(item => ({ id: item.id, current_status: item.item_status }))
    });

    // Update all items to match order status
    const [result] = await db.execute(
      'UPDATE order_items SET item_status = ?, updated_at = NOW() WHERE order_id = ?',
      [orderStatus, id]
    );

    console.log(`✅ Synced ${result.affectedRows} items to status: ${orderStatus}`);

    // Get updated items
    const [updatedItems] = await db.execute(
      'SELECT id, item_status FROM order_items WHERE order_id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Synced ${result.affectedRows} items to ${orderStatus}`,
      order_id: id,
      order_status: orderStatus,
      items_updated: result.affectedRows,
      before_sync: currentItems.map(item => ({ id: item.id, status: item.item_status })),
      after_sync: updatedItems.map(item => ({ id: item.id, status: item.item_status }))
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync item status: ' + error.message
    });
  }
};

// Helper function
const calculateExpectedDelivery = (status) => {
  const deliveryDates = {
    'pending': '3-5 business days',
    'confirmed': '2-4 business days',
    'shipped': '1-2 business days',
    'delivered': 'Delivered',
    'cancelled': 'Cancelled'
  };
  return deliveryDates[status] || '3-5 business days';
};

// @desc    Set expected delivery date & tracking (Admin) - ✅ NEW FUNCTION
// @route   PUT /api/admin/orders/:id/delivery-info
// @access  Private/Admin
const setDeliveryInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { expected_delivery_date, tracking_number } = req.body;

    console.log('🚚 Updating delivery info:', { id, expected_delivery_date, tracking_number });

    if (!expected_delivery_date && !tracking_number) {
      return res.status(400).json({
        success: false,
        message: 'Expected delivery date or tracking number is required'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (expected_delivery_date) {
      updates.push('expected_delivery_date = ?');
      values.push(expected_delivery_date);
    }

    if (tracking_number) {
      updates.push('tracking_number = ?');
      values.push(tracking_number);
    }

    // Always update updated_at
    updates.push('updated_at = NOW()');

    // Add order id to values
    values.push(id);

    const [result] = await db.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Delivery information updated successfully'
    });

  } catch (error) {
    console.error('❌ Set delivery info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update delivery information: ' + error.message
    });
  }
};

// @desc    Update shipped/delivered timestamps when status changes - ✅ NEW FUNCTION
// @route   PUT /api/admin/orders/:id/update-timestamps
// @access  Private/Admin
const updateShippedDeliveredDates = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status } = req.body;

    console.log('⏰ Updating timestamps:', { id, order_status });

    if (!order_status) {
      return res.status(400).json({
        success: false,
        message: 'Order status is required'
      });
    }

    let updateQuery = 'UPDATE orders SET updated_at = NOW()';
    const values = [];

    if (order_status === 'shipped') {
      updateQuery += ', shipped_at = NOW()';
    } else if (order_status === 'delivered') {
      updateQuery += ', delivered_at = NOW()';
    }

    updateQuery += ' WHERE id = ?';
    values.push(id);

    const [result] = await db.execute(updateQuery, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Timestamps updated successfully'
    });

  } catch (error) {
    console.error('❌ Update timestamps error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update timestamps: ' + error.message
    });
  }
};

// ✅ PERMANENT FIX: Get orders by user ID (Public endpoint)
const getOrdersByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    console.log('🔍 [USER ORDERS] Fetching for user ID:', userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const [userCheck] = await db.execute(
      'SELECT id, email FROM users WHERE id = ?',
      [userId]
    );

    if (userCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get orders
    const [orders] = await db.execute(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // Get items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.execute(
          `SELECT 
            oi.*,
            p.name as product_name,
            p.image as product_image
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`,
          [order.id]
        );

        return {
          id: order.id,
          user_id: order.user_id,
          total_amount: parseFloat(order.total_amount) || 0,
          payment_status: order.payment_status,
          order_status: order.order_status,
          shipping_address: order.shipping_address,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          created_at: order.created_at,
          tracking_number: order.tracking_number,
          expected_delivery_date: order.expected_delivery_date,
          items: items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name || 'Product',
            image: item.product_image,
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
            item_status: item.item_status || order.order_status
          }))
        };
      })
    );

    console.log(`✅ Found ${ordersWithItems.length} orders for user ID ${userId}`);

    res.json({
      success: true,
      count: ordersWithItems.length,
      orders: ordersWithItems
    });

  } catch (error) {
    console.error('❌ getOrdersByUserId error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders: ' + error.message
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrdersByCustomerEmail,
  trackOrderItem,
  cancelOrder,
  getOrderById,
  trackOrder,
  getAllOrders,
  updateOrderStatus,
  updateItemTracking,
  syncItemStatus,
  setDeliveryInfo,
  updateShippedDeliveredDates,
  manuallySetOrderDates,
  getOrdersByUserId
};
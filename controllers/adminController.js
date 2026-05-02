// File: server/controllers/adminController.js - FIXED VERSION
const db = require('../config/database');

// @desc    Get all products (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
const getAdminProducts = async (req, res) => {
  try {
    console.log('📱 Admin fetching all products with correct images...');
    
    const [products] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.stock,
        p.category_id,
        p.image,
        p.ingredients,
        p.benefits,
        p.tags,
        p.is_featured,
        p.created_at,
        c.name as category_name,
        -- ✅ Get ALL images from product_images table
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', pi.id,
              'url', pi.url,
              'is_main', pi.is_main
            )
          ), 
          JSON_ARRAY()
        ) as all_images_data,
        COUNT(pi.id) as product_images_count
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id, p.name, p.description, p.price, p.original_price, 
              p.stock, p.category_id, p.image, p.ingredients, 
              p.benefits, p.tags, p.is_featured, p.created_at, 
              c.name
      ORDER BY p.created_at DESC
    `);

    console.log(`✅ Found ${products.length} products for admin dashboard`);

    const formattedProducts = products.map(product => {
      let imagesArray = [];
      let imagesCount = parseInt(product.product_images_count) || 0;
      
      if (imagesCount > 0) {
        try {
          const parsedData = JSON.parse(product.all_images_data || '[]');
          parsedData.sort((a, b) => {
            if (b.is_main && !a.is_main) return 1;
            if (a.is_main && !b.is_main) return -1;
            return a.id - b.id;
          });
          
          imagesArray = parsedData
            .filter(img => img && img.url)
            .map(img => img.url);
        } catch (e) {
          console.error(`Error parsing images for product ${product.id}:`, e.message);
        }
      }
      
      if (imagesArray.length === 0 && product.image) {
        imagesArray = [product.image];
      }
      
      if (imagesArray.length === 0) {
        imagesArray = ['/api/placeholder/400/400'];
      }
      
      return {
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: parseFloat(product.price) || 0,
        original_price: product.original_price ? parseFloat(product.original_price) : null,
        stock: parseInt(product.stock) || 0,
        category: product.category_name?.toLowerCase().replace(' ', '-') || 'face-care',
        image: product.image || '/api/placeholder/400/400',
        images: imagesArray,
        ingredients: product.ingredients || '',
        benefits: product.benefits || '',
        tags: product.tags || '',
        is_featured: Boolean(product.is_featured),
        created_at: product.created_at
      };
    });

    res.json({
      success: true,
      count: formattedProducts.length,
      products: formattedProducts
    });
  } catch (error) {
    console.error('❌ Get admin products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  try {
    console.log('🔍 Admin fetching all orders...');
    
    // ✅ FIXED: Select ALL fields including dates
    const [orders] = await db.execute(`
      SELECT 
        o.*, 
        u.name as user_name,
        COUNT(oi.id) as items_count,
        -- ✅ CRITICAL: Format dates for frontend
        DATE_FORMAT(o.expected_delivery_date, '%Y-%m-%d') as formatted_expected,
        DATE_FORMAT(o.shipped_at, '%Y-%m-%d %H:%i:%s') as formatted_shipped,
        DATE_FORMAT(o.delivered_at, '%Y-%m-%d %H:%i:%s') as formatted_delivered
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY 
        o.id, o.user_id, o.items, o.total_amount, o.payment_status, 
        o.payment_method, o.order_status, o.shipping_address, 
        o.customer_name, o.customer_email, o.customer_phone, 
        o.created_at, o.updated_at, o.cancellation_reason, 
        o.expected_delivery_date, o.tracking_number, o.shipped_at, 
        o.delivered_at, u.name
      ORDER BY o.created_at DESC
    `);

    console.log(`✅ Found ${orders.length} orders`);

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        try {
          const [items] = await db.execute(`
            SELECT 
              oi.*, 
              p.name as product_name, 
              p.image,
              c.name as category_name
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE oi.order_id = ?
          `, [order.id]);
          
          // ✅ RETURN ALL DATE FIELDS
          const processedOrder = {
            id: order.id,
            order_status: order.order_status,
            payment_status: order.payment_status,
            total_amount: parseFloat(order.total_amount) || 0,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            customer_phone: order.customer_phone,
            shipping_address: order.shipping_address,
            created_at: order.created_at,
            user_id: order.user_id,
            user_name: order.user_name,
            items_count: items.length,
            items: items.map(item => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_image: item.image,
              category: item.category_name || 'Uncategorized',
              quantity: item.quantity,
              price: parseFloat(item.price) || 0,
              item_status: item.item_status || 'pending'
            })),
            // ✅ MUST HAVE THESE FIELDS:
            tracking_number: order.tracking_number,
            expected_delivery_date: order.formatted_expected || order.expected_delivery_date,
            shipped_at: order.formatted_shipped || order.shipped_at,
            delivered_at: order.formatted_delivered || order.delivered_at
          };
          
          // Debug log
          console.log(`Order ${processedOrder.id} dates:`, {
            expected: processedOrder.expected_delivery_date,
            shipped: processedOrder.shipped_at,
            delivered: processedOrder.delivered_at
          });
          
          return processedOrder;
        } catch (err) {
          console.error(`Error for order ${order.id}:`, err);
          return {
            ...order,
            items: [],
            items_count: 0,
            tracking_number: order.tracking_number,
            expected_delivery_date: order.formatted_expected,
            shipped_at: order.formatted_shipped,
            delivered_at: order.formatted_delivered
          };
        }
      })
    );

    // ✅ Verify what we're sending
    console.log('📤 Sending to frontend - Sample order:', {
      id: ordersWithDetails[0]?.id,
      expected: ordersWithDetails[0]?.expected_delivery_date,
      shipped: ordersWithDetails[0]?.shipped_at,
      delivered: ordersWithDetails[0]?.delivered_at
    });

    res.json({
      success: true,
      count: ordersWithDetails.length,
      orders: ordersWithDetails
    });

  } catch (error) {
    console.error('❌ Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin

const updateOrderStatus = async (req, res) => {
  try {
    console.log('='.repeat(80));
    console.log('🚨 ORDER UPDATE REQUEST RECEIVED');
    console.log('='.repeat(80));
    
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('📦 Request Params:', req.params);
    
    const { status, shipped_at, delivered_at } = req.body;
    const { id } = req.params;

    console.log(`🎯 Target: Order ID ${id}`);
    console.log(`🎯 New Status: ${status}`);
    console.log(`📅 shipped_at received: ${shipped_at}`);
    console.log(`📅 delivered_at received: ${delivered_at}`);

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.log(`❌ Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Check if order exists
    const [existingOrder] = await db.execute(
      'SELECT id, order_status, shipped_at, delivered_at FROM orders WHERE id = ?',
      [id]
    );
    
    if (existingOrder.length === 0) {
      console.log(`❌ Order ${id} not found`);
      return res.status(404).json({
        success: false,
        message: `Order ${id} not found in database`
      });
    }

    console.log(`📊 Current DB state - Order ${id}:`, {
      status: existingOrder[0].order_status,
      shipped_at: existingOrder[0].shipped_at,
      delivered_at: existingOrder[0].delivered_at
    });

    // 🚨 CRITICAL FIX: Prepare SQL update
    const updates = [];
    const values = [];
    
    // Always update status
    updates.push('order_status = ?');
    values.push(status);
    
    // Always update timestamp
    updates.push('updated_at = NOW()');
    
    // 🚨 Handle shipped_at - Convert ISO to MySQL datetime
    if (status === 'shipped' || shipped_at) {
      let shipTimestamp;
      
      if (shipped_at) {
        // Convert ISO to MySQL datetime (YYYY-MM-DD HH:MM:SS)
        const date = new Date(shipped_at);
        shipTimestamp = date.toISOString().slice(0, 19).replace('T', ' ');
        console.log(`🚚 Converting shipped_at: ${shipped_at} -> ${shipTimestamp}`);
      } else {
        shipTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        console.log(`🚚 Auto-generating shipped_at: ${shipTimestamp}`);
      }
      
      updates.push('shipped_at = ?');
      values.push(shipTimestamp);
    }
    
    // 🚨 Handle delivered_at - Convert ISO to MySQL datetime
    if (status === 'delivered' || delivered_at) {
      let deliverTimestamp;
      
      if (delivered_at) {
        // Convert ISO to MySQL datetime (YYYY-MM-DD HH:MM:SS)
        const date = new Date(delivered_at);
        deliverTimestamp = date.toISOString().slice(0, 19).replace('T', ' ');
        console.log(`📦 Converting delivered_at: ${delivered_at} -> ${deliverTimestamp}`);
      } else {
        deliverTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        console.log(`📦 Auto-generating delivered_at: ${deliverTimestamp}`);
      }
      
      updates.push('delivered_at = ?');
      values.push(deliverTimestamp);
      
      // Ensure shipped_at is also set
      if (!shipped_at && existingOrder[0].shipped_at === null) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayTimestamp = yesterday.toISOString().slice(0, 19).replace('T', ' ');
        updates.push('shipped_at = ?');
        values.push(yesterdayTimestamp);
        console.log(`📆 Auto-setting shipped_at to yesterday: ${yesterdayTimestamp}`);
      }
    }
    
    // Add WHERE clause
    values.push(id);
    
    // Build SQL
    const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;
    
    console.log('='.repeat(80));
    console.log('📝 FINAL SQL TO EXECUTE:');
    console.log(sql);
    console.log('📝 VALUES:', values);
    console.log('='.repeat(80));
    
    // Execute update
    console.log('⚡ Executing database update...');
    const [result] = await db.execute(sql, values);
    
    console.log(`✅ Database update result:`, {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
      message: result.message
    });
    
    if (result.affectedRows === 0) {
      console.log(`❌ No rows affected - update failed`);
      return res.status(500).json({
        success: false,
        message: 'Update failed - no rows affected'
      });
    }
    
    // 🚨 VERIFY the update
    console.log('🔍 Verifying update...');
    const [updatedOrder] = await db.execute(
      `SELECT 
        id,
        order_status,
        DATE_FORMAT(shipped_at, '%Y-%m-%d %H:%i:%s') as shipped_at,
        DATE_FORMAT(delivered_at, '%Y-%m-%d %H:%i:%s') as delivered_at,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') as updated_at
       FROM orders WHERE id = ?`,
      [id]
    );
    
    console.log('='.repeat(80));
    console.log('🎉 UPDATE VERIFICATION RESULT:');
    console.log(JSON.stringify(updatedOrder[0], null, 2));
    console.log('='.repeat(80));

    res.json({
      success: true,
      message: `Order #${id} successfully updated to ${status}`,
      order: updatedOrder[0],
      debug: {
        request_body: req.body,
        sql_executed: sql,
        values_used: values,
        result: {
          affectedRows: result.affectedRows,
          changedRows: result.changedRows
        }
      }
    });

  } catch (error) {
    console.error('='.repeat(80));
    console.error('💥💥💥 FATAL ERROR 💥💥💥');
    console.error('Error:', error.message);
    console.error('SQL Error Code:', error.code);
    console.error('SQL Error Message:', error.sqlMessage);
    console.error('SQL Query:', error.sql);
    console.error('='.repeat(80));
    
    res.status(500).json({
      success: false,
      message: 'Database update failed: ' + error.message,
      sqlError: error.sqlMessage,
      sqlCode: error.code
    });
  }
};

// Helper function to calculate date ranges
const getDateRangeForPeriod = (period, selectedYear) => {
  const today = new Date();
  let startDate, endDate;
  
  switch(period) {
    case 'today':
      startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    // case 'yesterday':
    //   const yesterday = new Date(today);
    //   yesterday.setDate(yesterday.getDate() - 1);
    //   startDate = new Date(yesterday);
    //   startDate.setHours(0, 0, 0, 0);
    //   endDate = new Date(yesterday);
    //   endDate.setHours(23, 59, 59, 999);
      //break;
      
    case 'week':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'month':
      // Current month (1st to today)
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'year':
      // Selected year
      const year = parseInt(selectedYear) || today.getFullYear();
      startDate = new Date(year, 0, 1); // January 1st
      endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
      
      // If selected year is current year, end date should be today
      if (year === today.getFullYear()) {
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
      
    default:
      // Last 30 days
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
  }
  
  return { startDate, endDate };
};

// @desc    Get sales report with CORRECT date filtering
// @route   GET /api/admin/report
// @access  Private/Admin
const getSalesReport = async (req, res) => {
  try {
    const { period = 'month', year = new Date().getFullYear() } = req.query;
    
    console.log(`📊 Generating sales report for period: ${period}, year: ${year}`);

    // Get date range
    const today = new Date();
    let startDate, endDate;
    
    switch(period) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
    }

    console.log(`📅 Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get sales data from ORDERS table
    const [salesData] = await db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN 1 ELSE 0 END), 0) as total_orders,
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) as total_items_sold,
        COUNT(DISTINCT o.customer_email) as unique_customers
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Get average order value
    const [avgData] = await db.execute(`
      SELECT 
        COALESCE(AVG(total_amount), 0) as average_order_value
      FROM orders 
      WHERE order_status != 'cancelled'
        AND created_at BETWEEN ? AND ?
    `, [startDate, endDate]);

    // Get previous period data
    let previousStartDate, previousEndDate;
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
    previousEndDate = new Date(endDate);
    previousEndDate.setDate(previousEndDate.getDate() - daysDiff);

    const [previousSalesData] = await db.execute(`
      SELECT 
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN 1 ELSE 0 END), 0) as total_orders
      FROM orders o
      WHERE o.created_at BETWEEN ? AND ?
    `, [previousStartDate, previousEndDate]);

    // Calculate growth
    const currentSales = parseFloat(salesData[0]?.total_sales) || 0;
    const previousSales = parseFloat(previousSalesData[0]?.total_sales) || 0;
    const currentOrders = parseInt(salesData[0]?.total_orders) || 0;
    const previousOrders = parseInt(previousSalesData[0]?.total_orders) || 0;
    
    let salesGrowth = 0;
    let ordersGrowth = 0;
    
    if (previousSales > 0) {
      salesGrowth = ((currentSales - previousSales) / previousSales) * 100;
    } else if (currentSales > 0) {
      salesGrowth = 100;
    }
    
    if (previousOrders > 0) {
      ordersGrowth = ((currentOrders - previousOrders) / previousOrders) * 100;
    } else if (currentOrders > 0) {
      ordersGrowth = 100;
    }

    // Get top products
    const [topProducts] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.image,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
        p.stock,
        p.price
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.order_status != 'cancelled'
        AND o.created_at BETWEEN ? AND ?
      GROUP BY p.id, p.name, p.image, c.name, p.stock, p.price
      ORDER BY revenue DESC
      LIMIT 5
    `, [startDate, endDate]);

    // Get category sales
    const [categorySales] = await db.execute(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_sales,
        COALESCE(SUM(oi.quantity), 0) as items_sold
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.order_status != 'cancelled'
        AND o.created_at BETWEEN ? AND ?
      GROUP BY c.name
      ORDER BY total_sales DESC
      LIMIT 5
    `, [startDate, endDate]);

    // Get daily sales
    const [dailySales] = await db.execute(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at BETWEEN ? AND ?
      GROUP BY DATE(o.created_at)
      ORDER BY date
    `, [startDate, endDate]);

    // Get recent orders for dashboard
    const [recentOrders] = await db.execute(`
      SELECT o.*, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    console.log('✅ Report generated successfully:', {
      totalSales: currentSales,
      totalOrders: currentOrders,
      topProductsCount: topProducts.length,
      categorySalesCount: categorySales.length,
      recentOrdersCount: recentOrders.length
    });

    res.json({
      success: true,
      report: {
        // Summary stats
        total_sales: parseFloat(currentSales.toFixed(2)),
        total_orders: currentOrders,
        total_items_sold: parseInt(salesData[0]?.total_items_sold) || 0,
        average_order_value: parseFloat(avgData[0]?.average_order_value || 0).toFixed(2),
        
        // Customer stats
        unique_customers: parseInt(salesData[0]?.unique_customers) || 0,
        
        // Growth metrics
        sales_growth: parseFloat(salesGrowth.toFixed(1)),
        orders_growth: parseFloat(ordersGrowth.toFixed(1)),
        
        // Products data
        top_products: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image || '/api/placeholder/100/100',
          category: p.category_name || 'Uncategorized',
          quantity_sold: parseInt(p.quantity_sold) || 0,
          revenue: parseFloat(p.revenue) || 0,
          stock: parseInt(p.stock) || 0,
          price: parseFloat(p.price) || 0
        })),
        
        // Category data
        category_sales: categorySales.map(c => ({
          name: c.category_name || 'Uncategorized',
          total_sales: parseFloat(c.total_sales) || 0,
          items_sold: parseInt(c.items_sold) || 0
        })),
        
        // Time-series data
        daily_sales: dailySales.map(d => ({
          date: d.date,
          orders: parseInt(d.orders) || 0,
          sales: parseFloat(d.sales) || 0,
          items: parseInt(d.items) || 0
        })),

        // Recent orders
        recent_orders: recentOrders.map(o => ({
          id: o.id,
          customer_name: o.customer_name || o.user_name || 'Customer',
          total_amount: parseFloat(o.total_amount) || 0,
          order_status: o.order_status,
          created_at: o.created_at
        })),
        
        // Metadata
        period: period,
        date_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating report: ' + error.message,
      error: error.message
    });
  }
};

// @desc    Get custom date range report
// @route   GET /api/admin/report/custom
// @access  Private/Admin
// getCustomDateReport function-ல் மட்டும் இந்த changes செய்யுங்க:

// @desc    Get custom date range report - COMPLETELY FIXED
// @route   GET /api/admin/report/custom
// @access  Private/Admin
const getCustomDateReport = async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required'
      });
    }
    
    console.log('ðŸ"… Custom date range report:', { start, end });
    
    // âœ… STEP 1: Get all active orders in date range
    const [allOrders] = await db.execute(`
      SELECT 
        o.id,
        o.order_status,
        o.total_amount,
        o.customer_name,
        o.customer_email,
        DATE(o.created_at) as order_date,
        o.created_at,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE DATE(o.created_at) BETWEEN ? AND ?
        AND o.order_status != 'cancelled'
      GROUP BY o.id, o.order_status, o.total_amount, o.customer_name, 
               o.customer_email, o.created_at
      ORDER BY o.created_at DESC
    `, [start, end]);

    console.log(`ðŸ"Š Found ${allOrders.length} orders between ${start} and ${end}`);
    
    // âœ… STEP 2: Get daily sales aggregation
    const [dailySales] = await db.execute(`
      SELECT 
        DATE(o.created_at) as date,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total_amount), 0) as sales,
        COALESCE(SUM(oi.quantity), 0) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE DATE(o.created_at) BETWEEN ? AND ?
        AND o.order_status != 'cancelled'
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
    `, [start, end]);

    console.log(`ðŸ"ˆ Daily sales data: ${dailySales.length} days`);
    
    // âœ… STEP 3: Calculate summary
    const totalOrders = allOrders.length;
    const totalSales = allOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const totalItems = allOrders.reduce((sum, o) => sum + parseInt(o.items_count || 0), 0);
    const uniqueCustomers = new Set(allOrders.map(o => o.customer_email)).size;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // âœ… STEP 4: Get top products for this period
    const [topProducts] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.image,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE DATE(o.created_at) BETWEEN ? AND ?
        AND o.order_status != 'cancelled'
      GROUP BY p.id, p.name, p.image, c.name
      ORDER BY revenue DESC
      LIMIT 5
    `, [start, end]);
    
    // âœ… STEP 5: Build response
    const response = {
      success: true,
      report: {
        period: 'custom',
        date_range: { start, end },
        
        // Summary stats
        total_orders: totalOrders,
        total_sales: parseFloat(totalSales.toFixed(2)),
        total_items_sold: totalItems,
        average_order_value: parseFloat(avgOrderValue.toFixed(2)),
        unique_customers: uniqueCustomers,
        
        // Growth (no comparison for custom range)
        sales_growth: 0,
        orders_growth: 0,
        
        // âœ… Daily sales data (for chart)
        daily_sales: dailySales.map(day => ({
          date: day.date,
          orders: parseInt(day.orders) || 0,
          sales: parseFloat(day.sales) || 0,
          items: parseInt(day.items) || 0
        })),
        
        // âœ… Individual orders (for table view)
        individual_orders: allOrders.map(order => ({
          id: order.id,
          order_date: order.order_date,
          created_at: order.created_at,
          customer_name: order.customer_name || 'Customer',
          customer_email: order.customer_email || '',
          order_status: order.order_status,
          total_amount: parseFloat(order.total_amount) || 0,
          items_count: parseInt(order.items_count) || 0
        })),
        
        // Top products
        top_products: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image || '/api/placeholder/100/100',
          category: p.category_name,
          quantity_sold: parseInt(p.quantity_sold) || 0,
          revenue: parseFloat(p.revenue) || 0
        })),
        
        // Empty arrays for compatibility
        recent_orders: [],
        category_sales: []
      }
    };

    console.log("âœ… Custom report generated:", {
      totalOrders: response.report.total_orders,
      totalSales: response.report.total_sales,
      dailySalesCount: response.report.daily_sales.length,
      individualOrdersCount: response.report.individual_orders.length
    });

    res.json(response);

  } catch (error) {
    console.error('âŒ Custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating custom report: ' + error.message,
      error: error.message
    });
  }
};

// @desc    Get yearly report
// @route   GET /api/admin/report/year
// @access  Private/Admin
const getYearlyReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    console.log(`📊 Yearly report for: ${year}`);

    // Get data for specific year
    const [yearData] = await db.execute(`
      SELECT 
        MONTH(created_at) as month,
        DATE_FORMAT(created_at, '%Y-%m') as period,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(
          (SELECT SUM(quantity) 
           FROM order_items oi 
           WHERE oi.order_id = o.id)
        ), 0) as total_items_sold
      FROM orders o
      WHERE YEAR(created_at) = ?
        AND order_status != 'cancelled'
      GROUP BY MONTH(created_at), DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `, [year]);

    // Get previous year for comparison
    const prevYear = parseInt(year) - 1;
    const [prevYearData] = await db.execute(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE YEAR(created_at) = ?
        AND order_status != 'cancelled'
    `, [prevYear]);

    // Get top products for the year
    const [topProducts] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.image,
        p.category_id,
        c.name as category_name,
        COALESCE(SUM(oi.quantity), 0) as quantity_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as revenue,
        p.stock,
        p.price
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.order_status != 'cancelled'
        AND YEAR(o.created_at) = ?
      GROUP BY p.id, p.name, p.image, p.category_id, c.name, p.stock, p.price
      ORDER BY revenue DESC
      LIMIT 10
    `, [year]);

    // Get customer stats for the year
    const [customerStats] = await db.execute(`
      SELECT 
        COUNT(DISTINCT o.customer_email) as unique_customers
      FROM orders o
      WHERE o.order_status != 'cancelled'
        AND YEAR(o.created_at) = ?
    `, [year]);

    // Calculate totals
    const totalOrders = yearData.reduce((sum, month) => sum + (month.total_orders || 0), 0);
    const totalSales = yearData.reduce((sum, month) => sum + (month.total_sales || 0), 0);
    const totalItemsSold = yearData.reduce((sum, month) => sum + (month.total_items_sold || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calculate growth
    const prevTotalSales = prevYearData[0]?.total_sales || 0;
    const prevTotalOrders = prevYearData[0]?.total_orders || 0;
    
    let salesGrowth = 0;
    let ordersGrowth = 0;
    
    if (prevTotalSales > 0) {
      salesGrowth = ((totalSales - prevTotalSales) / prevTotalSales) * 100;
    } else if (totalSales > 0) {
      salesGrowth = 100;
    }
    
    if (prevTotalOrders > 0) {
      ordersGrowth = ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100;
    } else if (totalOrders > 0) {
      ordersGrowth = 100;
    }

    console.log('✅ Yearly report generated for', year, {
      totalOrders,
      totalSales: parseFloat(totalSales.toFixed(2)),
      salesGrowth: parseFloat(salesGrowth.toFixed(1))
    });

    res.json({
      success: true,
      report: {
        year: parseInt(year),
        total_orders: totalOrders,
        total_sales: parseFloat(totalSales.toFixed(2)),
        total_items_sold: totalItemsSold,
        average_order_value: parseFloat(avgOrderValue.toFixed(2)),
        unique_customers: parseInt(customerStats[0]?.unique_customers) || 0,
        sales_growth: parseFloat(salesGrowth.toFixed(1)),
        orders_growth: parseFloat(ordersGrowth.toFixed(1)),
        top_products: topProducts.map(p => ({
          id: p.id,
          name: p.name,
          image: p.image ? (p.image.startsWith('/uploads') ? p.image : `/uploads/${p.image}`) : '/api/placeholder/100/100',
          category: p.category_name,
          quantity_sold: parseInt(p.quantity_sold) || 0,
          revenue: parseFloat(p.revenue) || 0,
          stock: parseInt(p.stock) || 0,
          price: parseFloat(p.price) || 0
        })),
        monthly_data: yearData.map(month => ({
          month: month.month,
          period: month.period,
          orders: parseInt(month.total_orders) || 0,
          sales: parseFloat(month.total_sales) || 0,
          items: parseInt(month.total_items_sold) || 0
        }))
      }
    });

  } catch (error) {
    console.error('❌ Yearly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating yearly report: ' + error.message
    });
  }
};

// @desc    Delete product image
// @route   DELETE /api/admin/products/:productId/images
// @access  Private/Admin
const deleteProductImage = async (req, res) => {
  try {
    const { productId } = req.params;
    const { imageIndex } = req.body;
    
    console.log(`🗑️ Deleting image ${imageIndex} from product ${productId}`);
    
    const [products] = await db.execute(
      'SELECT images FROM products WHERE id = ?',
      [productId]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    const product = products[0];
    let images = [];
    
    try {
      if (product.images) {
        images = JSON.parse(product.images);
      }
    } catch (e) {
      console.log('Images field is not valid JSON, treating as empty');
    }
    
    if (imageIndex < 0 || imageIndex >= images.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid image index' 
      });
    }
    
    const deletedImage = images[imageIndex];
    images.splice(imageIndex, 1);
    
    await db.execute(
      'UPDATE products SET images = ? WHERE id = ?',
      [JSON.stringify(images), productId]
    );
    
    console.log(`✅ Image deleted. Remaining: ${images.length} images`);
    
    res.json({ 
      success: true, 
      message: 'Image deleted successfully',
      remainingImages: images.length 
    });
    
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete image' 
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics from database...');
    
    const [currentMonthStats] = await db.execute(`
      SELECT 
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as items_sold,
        COALESCE(AVG(o.total_amount), 0) as avg_order_value
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.order_status != 'cancelled'
        AND MONTH(o.created_at) = MONTH(CURRENT_DATE())
        AND YEAR(o.created_at) = YEAR(CURRENT_DATE())
    `);

    const [lastMonthStats] = await db.execute(`
      SELECT 
        COALESCE(SUM(o.total_amount), 0) as total_sales,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(oi.quantity), 0) as items_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.order_status != 'cancelled'
        AND MONTH(o.created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(o.created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    `);

    const currentSales = parseFloat(currentMonthStats[0]?.total_sales) || 0;
    const lastSales = parseFloat(lastMonthStats[0]?.total_sales) || 0;
    const salesChange = lastSales > 0 ? ((currentSales - lastSales) / lastSales) * 100 : 0;

    const currentOrders = parseInt(currentMonthStats[0]?.total_orders) || 0;
    const lastOrders = parseInt(lastMonthStats[0]?.total_orders) || 0;
    const ordersChange = lastOrders > 0 ? ((currentOrders - lastOrders) / lastOrders) * 100 : 0;

    const currentItems = parseInt(currentMonthStats[0]?.items_sold) || 0;
    const lastItems = parseInt(lastMonthStats[0]?.items_sold) || 0;
    const itemsChange = lastItems > 0 ? ((currentItems - lastItems) / lastItems) * 100 : 0;

    console.log('✅ Dashboard data fetched successfully:', {
      total_sales: currentSales,
      total_orders: currentOrders,
      items_sold: currentItems
    });

    res.json({
      success: true,
      data: {
        total_sales: Math.round(currentSales),
        sales_change: parseFloat(salesChange.toFixed(1)),
        sales_trend: salesChange < 0 ? 'decrease' : 'increase',
        total_orders: currentOrders,
        orders_change: parseFloat(ordersChange.toFixed(1)),
        orders_trend: ordersChange < 0 ? 'decrease' : 'increase',
        items_sold: currentItems,
        items_change: parseFloat(itemsChange.toFixed(1)),
        items_trend: itemsChange < 0 ? 'decrease' : 'increase',
        avg_order_value: parseFloat(currentMonthStats[0]?.avg_order_value || 0).toFixed(2),
        current_month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        last_update: new Date().toISOString(),
        is_real_data: true
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics: ' + error.message
    });
  }
};

// @desc    Update order timestamps when status changes
// @route   PUT /api/admin/orders/:id/update-timestamps
// @access  Private/Admin
const updateOrderTimestamps = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status } = req.body;

    console.log('🕒 Updating order timestamps:', { id, order_status });

    let updates = [];
    let values = [];

    // Set shipped_at when status becomes 'shipped'
    if (order_status === 'shipped') {
      updates.push('shipped_at = NOW()');
    }

    // Set delivered_at when status becomes 'delivered'
    if (order_status === 'delivered') {
      updates.push('delivered_at = NOW()');
      
      // If shipped_at not set, set it too
      const [existingOrder] = await db.execute(
        'SELECT shipped_at FROM orders WHERE id = ?',
        [id]
      );
      
      if (!existingOrder[0]?.shipped_at) {
        updates.push('shipped_at = DATE_SUB(NOW(), INTERVAL 1 DAY)');
      }
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      
      const [result] = await db.execute(
        `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
        [id]
      );

      console.log('✅ Timestamps updated:', updates);
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

// ✅ CORRECTED EXPORTS - ONLY ONE OF EACH FUNCTION
module.exports = {
  getOrders,
  updateOrderStatus,
  getSalesReport,          // Only one function
  getAdminProducts,
  deleteProductImage,
  getDashboardStats,
  getCustomDateReport,     // Only one function
  getYearlyReport,
  updateOrderTimestamps
  // Remove duplicate exports
};
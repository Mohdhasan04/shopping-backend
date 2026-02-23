// File: server/models/Order.js - COMPLETE FIXED VERSION
const db = require('../config/database');

class Order {
  // CREATE ORDER
  static async create(orderData) {
    try {
      console.log('📦 [Order.create] Creating order...');
      
      const {
        user_id,
        shipping_address,
        customer_name,
        customer_email,
        customer_phone,
        total_amount,
        payment_method,
        payment_status,
        tracking_number,
        expected_delivery_date
      } = orderData;

      const expectedDate = expected_delivery_date || 
        new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // ✅ FIXED INSERT QUERY
      const query = `
        INSERT INTO orders (
          user_id, total_amount, order_status, payment_status, payment_method,
          shipping_address, customer_name, customer_email, customer_phone,
          tracking_number, expected_delivery_date, created_at
        ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const values = [
        user_id || null,
        parseFloat(total_amount) || 0,
        payment_status || 'pending',
        payment_method || 'cod',
        shipping_address,
        customer_name,
        customer_email,
        customer_phone || '',
        tracking_number || `TRK${Date.now().toString().slice(-8)}`,
        expectedDate
      ];

      const [orderResult] = await db.execute(query, values);
      const orderId = orderResult.insertId;
      
      console.log('✅ Order created with ID:', orderId);
      console.log('🔍 MySQL insertId:', orderResult.insertId);
      
      // Insert order items
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          await db.execute(
            `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              orderId, 
              item.product_id, 
              item.product_name || 'Product', 
              item.quantity, 
              parseFloat(item.price) || 0
            ]
          );
        }
      }

      return orderId;

    } catch (error) {
      console.error('❌ Order create error:', error);
      throw error;
    }
  }

  // FIND BY ID - FIXED (NO COMMENTS IN SQL)
  static async findById(orderId) {
    try {
      console.log('🔍 [Order.findById] Finding order:', orderId);
      
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
          o.created_at,
          o.updated_at
         FROM orders o 
         WHERE o.id = ?`,
        [orderId]
      );

      if (orders.length === 0) return null;

      const order = orders[0];
      
      // Convert total_amount to number
      const processedOrder = {
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        payment_method: order.payment_method || 'cod'
      };

      // Get order items
      const [items] = await db.execute(
        `SELECT 
          oi.*, 
          p.name as product_name, 
          p.image,
          c.name as category_name,
          COALESCE(oi.item_status, o.order_status) as display_status
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN orders o ON oi.order_id = o.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      const processedItems = items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.image || item.product_image,
        category: item.category_name || 'Uncategorized',
        quantity: item.quantity,
        price: parseFloat(item.price) || 0,
        item_status: item.display_status || order.order_status,
        tracking_id: item.tracking_id || null
      }));

      return {
        ...processedOrder,
        items: processedItems
      };

    } catch (error) {
      console.error('❌ Find order by ID error:', error);
      throw error;
    }
  }

  // FIND BY USER ID - FIXED (NO COMMENTS IN SQL)
  static async findByUserId(userId) {
    try {
      console.log('🔍 [Order.findByUserId] Finding orders for user:', userId);
      
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

      // Convert total_amount to number for each order
      const processedOrders = orders.map(order => ({
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        payment_method: order.payment_method || 'cod'
      }));

      // For each order, get items
      const ordersWithItems = await Promise.all(
        processedOrders.map(async (order) => {
          const [items] = await db.execute(
            `SELECT 
              oi.*, 
              p.name as product_name, 
              p.image,
              c.name as category_name,
              COALESCE(oi.item_status, o.order_status) as display_status
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN orders o ON oi.order_id = o.id
             WHERE oi.order_id = ?`,
            [order.id]
          );

          const processedItems = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.image,
            category: item.category_name || 'Uncategorized',
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
            item_status: item.display_status || order.order_status,
            tracking_id: item.tracking_id || null
          }));
          
          return {
            ...order,
            items: processedItems
          };
        })
      );

      console.log(`✅ Found ${ordersWithItems.length} orders for user ${userId}`);
      return ordersWithItems;

    } catch (error) {
      console.error('❌ Find orders by user error:', error);
      throw error;
    }
  }

  // FIND BY CUSTOMER EMAIL - FIXED (NO COMMENTS IN SQL)
  static async findByCustomerEmail(customerEmail) {
    try {
      console.log('🔍 [Order.findByCustomerEmail] Finding orders for email:', customerEmail);
      
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
         WHERE o.customer_email = ?
         ORDER BY o.created_at DESC`,
        [customerEmail]
      );

      // Convert total_amount to number for each order
      const processedOrders = orders.map(order => ({
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        payment_method: order.payment_method || 'cod'
      }));

      // For each order, get items
      const ordersWithItems = await Promise.all(
        processedOrders.map(async (order) => {
          const [items] = await db.execute(
            `SELECT 
              oi.*, 
              p.name as product_name, 
              p.image,
              c.name as category_name,
              COALESCE(oi.item_status, o.order_status) as display_status
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN orders o ON oi.order_id = o.id
             WHERE oi.order_id = ?`,
            [order.id]
          );

          const processedItems = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.image,
            category: item.category_name || 'Uncategorized',
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
            item_status: item.display_status || order.order_status,
            tracking_id: item.tracking_id || null
          }));
          
          return {
            ...order,
            items: processedItems
          };
        })
      );

      console.log(`✅ Found ${ordersWithItems.length} orders for email ${customerEmail}`);
      return ordersWithItems;

    } catch (error) {
      console.error('❌ Find orders by customer email error:', error);
      throw error;
    }
  }

  // FIND ALL ORDERS - FIXED (NO COMMENTS IN SQL)
  static async findAll() {
    try {
      console.log('🔍 [Order.findAll] Finding all orders...');
      
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
          o.created_at,
          o.updated_at
         FROM orders o 
         ORDER BY o.created_at DESC`
      );

      // Convert total_amount to number for all orders
      const processedOrders = orders.map(order => ({
        ...order,
        total_amount: parseFloat(order.total_amount) || 0,
        payment_method: order.payment_method || 'cod'
      }));

      // For each order, get items
      const ordersWithItems = await Promise.all(
        processedOrders.map(async (order) => {
          const [items] = await db.execute(
            `SELECT 
              oi.*, 
              p.name as product_name, 
              p.image,
              c.name as category_name,
              COALESCE(oi.item_status, o.order_status) as display_status
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             LEFT JOIN categories c ON p.category_id = c.id
             LEFT JOIN orders o ON oi.order_id = o.id
             WHERE oi.order_id = ?`,
            [order.id]
          );

          const processedItems = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_image: item.image,
            category: item.category_name || 'Uncategorized',
            quantity: item.quantity,
            price: parseFloat(item.price) || 0,
            item_status: item.display_status || order.order_status,
            tracking_id: item.tracking_id || null
          }));
          
          return {
            ...order,
            items: processedItems
          };
        })
      );

      console.log(`✅ Found ${ordersWithItems.length} total orders`);
      return ordersWithItems;

    } catch (error) {
      console.error('❌ Find all orders error:', error);
      throw error;
    }
  }
}

module.exports = Order;
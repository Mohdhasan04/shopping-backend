// server/routes/adminRoutes.js - COMPLETE WORKING VERSION
const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const db = require('../config/database');

// ✅ ENABLE MIDDLEWARE FOR ALL ADMIN ROUTES
router.use(protect, admin);

// ✅ GET ALL PRODUCTS (ADMIN VIEW)
router.get('/products', adminController.getAdminProducts);

// ✅ CREATE NEW PRODUCT - FIXED
router.post('/products', async (req, res) => {
  try {
    console.log('🆕 ADMIN: Creating new product...');
    console.log('📦 Request body:', req.body);
    
    // Extract data
    const { 
      name, 
      description = '', 
      price, 
      original_price = null,
      stock = 10, 
      category_id = 1,
      image = 'https://via.placeholder.com/500x500/f3f4f6/9ca3af?text=Product+Image',
      ingredients = '',
      benefits = '',
      tags = '',
      is_featured = false
    } = req.body;
    
    // Validate
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Product name and price are required'
      });
    }
    
    // Convert to numbers
    const priceNum = parseFloat(price);
    const originalPriceNum = original_price ? parseFloat(original_price) : null;
    const stockNum = parseInt(stock) || 10;
    const categoryIdNum = parseInt(category_id) || 1;
    
    // Insert into database
    const [result] = await db.execute(
      `INSERT INTO products 
       (name, description, price, original_price, category_id, stock, 
        image, ingredients, benefits, tags, is_featured, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        name.trim(),
        description.trim(),
        priceNum,
        originalPriceNum,
        categoryIdNum,
        stockNum,
        image.trim(),
        ingredients.trim(),
        benefits.trim(),
        tags.trim(),
        is_featured ? 1 : 0
      ]
    );
    
    console.log('✅ Product created! ID:', result.insertId);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      productId: result.insertId,
      product: {
        id: result.insertId,
        name: name.trim(),
        price: priceNum,
        category_id: categoryIdNum,
        stock: stockNum
      }
    });
    
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product: ' + error.message,
      error: error.message
    });
  }
});

// ✅ OTHER ADMIN ROUTES (copy from your existing)
router.get('/orders', adminController.getOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.get('/report', adminController.getSalesReport);
router.get('/report/custom', adminController.getCustomDateReport);
router.get('/report/year', adminController.getYearlyReport);
router.delete('/products/:productId/images', adminController.deleteProductImage);
router.get('/dashboard/stats', adminController.getDashboardStats);

// ✅ DELIVERY ROUTES
router.put('/orders/:id/delivery-info', async (req, res) => {
  try {
    const { id } = req.params;
    const { expected_delivery_date, tracking_number } = req.body;
    
    await db.execute(
      'UPDATE orders SET expected_delivery_date = ?, tracking_number = ? WHERE id = ?',
      [expected_delivery_date, tracking_number, id]
    );
    
    res.json({ 
      success: true, 
      message: 'Delivery info updated'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + error.message 
    });
  }
});

// ✅ HEALTH CHECK
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin API working',
    timestamp: new Date().toISOString(),
    user: req.user ? {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    } : null
  });
});

// ✅ TEST ENDPOINT (for debugging)
router.post('/test-create', async (req, res) => {
  try {
    console.log('🧪 TEST: Creating product...');
    
    const [result] = await db.execute(
      'INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)',
      ['Test Product ' + Date.now(), 99.99, 1]
    );
    
    res.json({
      success: true,
      message: 'Test product created',
      id: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
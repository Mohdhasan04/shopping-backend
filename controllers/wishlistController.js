// server/controllers/wishlistController.js - COMPLETE FIXED
const db = require('../config/database');

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
const addToWishlist = async (req, res) => {
  try {
    const { product_id } = req.body;
    const user_id = req.user.id;

    console.log('❤️ Adding to wishlist:', { user_id, product_id });

    const productId = parseInt(product_id);
    
    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Product ID is required'
      });
    }

    // Check if product exists
    const [products] = await db.execute(
      'SELECT id, name, price, image FROM products WHERE id = ?',
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if already in wishlist
    const [existing] = await db.execute(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [user_id, productId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    const [result] = await db.execute(
      'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
      [user_id, productId]
    );

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      wishlist_id: result.insertId
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist: ' + error.message
    });
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user_id = req.user.id;

    console.log('🗑️ Removing from wishlist:', { user_id, productId });

    const numericProductId = parseInt(productId);
    
    const [result] = await db.execute(
      'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
      [user_id, numericProductId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in wishlist'
      });
    }

    res.json({
      success: true,
      message: 'Product removed from wishlist'
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist: ' + error.message
    });
  }
};

// @desc    Get user wishlist
// @route   GET /api/wishlist
// @access  Private
const getWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;

    console.log('📋 Getting wishlist for user:', user_id);

    const [wishlistItems] = await db.execute(
      `SELECT w.id as wishlist_id, w.created_at, 
              p.id, p.name, p.price, p.image, p.stock, 
              p.description
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [user_id]
    );

    // ✅ FIX: Add full URL to images
    const itemsWithFullUrl = wishlistItems.map(item => ({
      ...item,
      image: item.image 
        ? `http://localhost:5000${item.image.startsWith('/') ? '' : '/'}${item.image}`
        : null
    }));

    console.log('📦 Wishlist items found:', itemsWithFullUrl.length);

    res.json({
      success: true,
      wishlist: itemsWithFullUrl
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist: ' + error.message
    });
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
const checkWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const user_id = req.user.id;

    const numericProductId = parseInt(productId);

    const [existing] = await db.execute(
      'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
      [user_id, numericProductId]
    );

    res.json({
      success: true,
      inWishlist: existing.length > 0
    });

  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist: ' + error.message
    });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlist
};
// File: server/controllers/reviewsController.js
const db = require('../config/database');

console.log('✅ reviewsController.js loaded');

// ✅ Create Review
const createReview = async (req, res) => {
  console.log('🔥 CREATE REVIEW called');
  
  try {
    const { product_id, rating, comment = '', user_id = 5 } = req.body;
    
    // ✅ VALIDATION
    if (!product_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and rating are required'
      });
    }
    
    // ✅ NO ORDER_ID NEEDED - REVIEWS DON'T REQUIRE ORDER
    // Order_id optional ah irukkum, NULL ah vidalam
    const [result] = await db.execute(
      `INSERT INTO reviews (product_id, user_id, rating, comment) 
       VALUES (?, ?, ?, ?)`,
      [product_id, user_id, rating, comment]
    );
    
    console.log(`✅ Review saved without order! ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review_id: result.insertId
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    // ✅ USER-FRIENDLY ERROR
    let userMessage = 'Failed to submit review';
    if (error.message.includes('foreign key')) {
      userMessage = 'System error. Please try again or contact support.';
    }
    
    res.status(500).json({
      success: false,
      message: userMessage
    });
  }
};

// ✅ Get Product Reviews
const getProductReviews = async (req, res) => {
  console.log('🔥 GET PRODUCT REVIEWS for:', req.params.productId);
  
  try {
    const productId = req.params.productId;
    
    // Get reviews from database
    const [reviews] = await db.execute(
      `SELECT 
        r.id,
        r.product_id,
        r.user_id,
        r.rating,
        r.comment,
        r.created_at,
        COALESCE(u.name, 'Customer') as user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC`,
      [productId]
    );
    
    console.log(`✅ Found ${reviews.length} reviews`);
    
    // Calculate average
    let averageRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((total, review) => total + review.rating, 0);
      averageRating = (sum / reviews.length).toFixed(1);
    }
    
    res.json({
      success: true,
      reviews: reviews.map(r => ({
        id: r.id,
        product_id: r.product_id,
        user_id: r.user_id,
        rating: r.rating,
        comment: r.comment || '',
        created_at: r.created_at,
        user_name: r.user_name || 'Customer'
      })),
      average_rating: parseFloat(averageRating),
      total_reviews: reviews.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.json({
      success: true,
      reviews: [],
      average_rating: 0,
      total_reviews: 0
    });
  }
};

// ✅ Test endpoint
const testReview = (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: 'Reviews API is working!',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  createReview,
  getProductReviews,
  testReview
};
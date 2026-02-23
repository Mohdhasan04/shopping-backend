// File: server/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();

console.log('✅ reviewRoutes.js loaded');

// Import controller
let reviewsController;
try {
  reviewsController = require('../controllers/reviewsController');
  console.log('✅ Controller imported successfully');
} catch (error) {
  console.error('❌ Failed to import controller:', error.message);
  // Create fallback
  reviewsController = {
    createReview: (req, res) => {
      res.json({ success: true, message: 'Fallback create review' });
    },
    getProductReviews: (req, res) => {
      res.json({ 
        success: true, 
        reviews: [],
        average_rating: 0,
        total_reviews: 0
      });
    },
    testReview: (req, res) => {
      res.json({ success: true, message: 'Fallback test' });
    }
  };
}

// ✅ Define routes
router.get('/test', reviewsController.testReview);
router.post('/', reviewsController.createReview);
router.get('/product/:productId', reviewsController.getProductReviews);

module.exports = router;
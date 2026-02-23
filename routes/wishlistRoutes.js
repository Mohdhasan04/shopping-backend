// server/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist
} = require('../controllers/wishlistController');

// Get user's wishlist
router.get('/', protect, getWishlist);

// Add item to wishlist - ✅ FIXED: Remove :productId from route
router.post('/', protect, addToWishlist); // CHANGED THIS LINE

// Remove item from wishlist
router.delete('/:productId', protect, removeFromWishlist);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
    createReturnRequest,
    getUserReturns,
    getReturnDetails,
    cancelReturnRequest,
    getAllReturns,
    updateReturnStatus,
    getReturnByOrder,
    getReturnByOrderAuth
} = require('../controllers/returnsController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public route - get return status for an order (by email)
router.get('/order/:orderId', getReturnByOrder);

// ✅ ADMIN ROUTES MUST COME BEFORE WILDCARD /:id ROUTES
// (Otherwise Express matches /admin as :id param)
router.get('/admin/all', protect, admin, getAllReturns);
router.put('/admin/:id/status', protect, admin, updateReturnStatus);

// User routes
router.post('/request', protect, createReturnRequest);
router.get('/my-order/:orderId', protect, getReturnByOrderAuth); // Authenticated return status
router.get('/user', protect, getUserReturns);

// Wildcard routes LAST - these would catch /admin/* if placed earlier
router.get('/:id', protect, getReturnDetails);
router.put('/:id/cancel', protect, cancelReturnRequest);

module.exports = router;

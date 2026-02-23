// File: server/routes/orderRoutes.js - SIMPLE WORKING VERSION
const express = require('express');
const router = express.Router();

const {
  createOrder,
  getUserOrders,
  getOrdersByUserId,
  getOrdersByCustomerEmail,
  getOrderById,
  trackOrder,
  trackOrderItem,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateItemTracking,
  syncItemStatus,
  setDeliveryInfo
  // ❌ Remove: updateShippedDeliveredDates (not in controller)
} = require('../controllers/orderController');

const { protect, admin } = require('../middleware/authMiddleware');

// ========================
// ✅ PUBLIC ROUTES
// ========================
router.get('/track/:id', trackOrder);
router.get('/customer/:email', getOrdersByCustomerEmail);
router.get('/user/:userId', getOrdersByUserId);

// ========================
// ✅ PROTECTED ROUTES
// ========================
router.use(protect);

router.get('/my-orders', getUserOrders);
router.get('/', getUserOrders);
router.post('/', createOrder);
router.post('/:id/cancel', cancelOrder);
router.get('/:id', getOrderById);

// ========================
// ✅ ADMIN ROUTES
// ========================
router.use(admin);

router.get('/admin/orders', getAllOrders);
router.put('/admin/orders/:id/status', updateOrderStatus);
router.put('/admin/orders/:orderId/items/:itemId/tracking', updateItemTracking);
router.post('/admin/orders/:id/sync-items', syncItemStatus);
router.put('/admin/orders/:id/delivery-info', setDeliveryInfo);

// ✅ Remove problematic line:
// router.put('/admin/orders/:id/update-timestamps', updateShippedDeliveredDates);

// ========================
// ✅ CATCH-ALL ROUTES
// ========================
router.get('/:orderId/items/:itemId/track', trackOrderItem);

// ========================
// ✅ TEST ENDPOINT
// ========================
router.get('/test/customer/:email', (req, res) => {
  res.json({
    success: true,
    message: 'Test route working',
    email: req.params.email
  });
});

module.exports = router;
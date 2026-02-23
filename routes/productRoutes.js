const express = require('express');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  getProductImages,
  deleteProductImage,
  deleteProductImageByIndex,
  setMainImage
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/authMiddleware');
const { uploadMultiple } = require('../middleware/uploadMiddleware');

const router = express.Router();

// ========== PUBLIC ROUTES ==========
router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/images', getProductImages);

// ========== ADMIN ROUTES ==========
router.post('/', protect, admin, createProduct);
router.put('/:id', protect, admin, updateProduct);
router.delete('/:id', protect, admin, deleteProduct);

// ========== IMAGE MANAGEMENT ROUTES ==========
router.post('/:id/upload-images', protect, admin, uploadMultiple('images'), uploadProductImages);
router.delete('/:id/images/:imageId', protect, admin, deleteProductImage);
router.delete('/:id/delete-image-by-index', protect, admin, deleteProductImageByIndex);
router.put('/:id/images/:imageId/set-main', protect, admin, setMainImage);

// ========== TEST ROUTES ==========
router.get('/test/:id', (req, res) => {
  res.json({
    success: true,
    product: {
      id: req.params.id,
      name: "Test Product - Working!",
      description: "This is a test product to confirm API is working",
      price: 999,
      stock: 50,
      images: ["https://via.placeholder.com/500x500"],
      timestamp: new Date().toISOString()
    }
  });
});

// ✅ TEST DELETE ENDPOINT
router.delete('/test-delete/:id', (req, res) => {
  console.log('✅ Test delete endpoint called:', req.params.id, req.body);
  res.json({
    success: true,
    message: 'Test delete endpoint working!',
    productId: req.params.id,
    imageIndex: req.body.imageIndex,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
// server/server.js - FIXED CORS VERSION
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ ✅ ✅ FIX 1: CORS MUST BE FIRST MIDDLEWARE
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ FIX 2: Handle preflight OPTIONS requests
app.options('*', cors());

// ✅ FIX 3: Database connection test
const { testConnection } = require('./config/db');
testConnection();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ FIX 4: Serve uploads folder
const uploadsPath = path.join(__dirname, 'uploads');
console.log('📁 Uploads directory path:', uploadsPath);

// Create uploads directory if not exists
const fs = require('fs');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Serve static files
app.use('/uploads', express.static(uploadsPath));

// Disable caching for development
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ✅ ✅ ✅ FIX 5: LOAD ROUTES - WISHLIST MUST BE AFTER AUTH
console.log('🔄 Loading routes...');

// 1. Auth Routes FIRST
app.use('/api/auth', require('./routes/authRoutes'));
console.log('✅ Auth routes loaded: /api/auth');

// 2. Admin Routes
app.use('/api/admin', require('./routes/adminRoutes'));
console.log('✅ Admin routes loaded: /api/admin');

// 3. Product Routes
app.use('/api/products', require('./routes/productRoutes'));
console.log('✅ Product routes loaded: /api/products');

// ✅ ✅ ✅ CRITICAL FIX: ADD ORDER ROUTES HERE
app.use('/api/orders', require('./routes/orderRoutes'));
console.log('✅ Order routes loaded: /api/orders');


// ✅ ✅ ✅ FIX 6: WISHLIST ROUTES - IMPORTANT!
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
console.log('✅ Wishlist routes loaded: /api/wishlist');

// ✅ ✅ ✅ FIX 7: RETURN ROUTES
app.use('/api/returns', require('./routes/returnRoutes'));
console.log('✅ Return routes loaded: /api/returns');

// ✅ IMPORT ROUTES
const reviewRoutes = require('./routes/reviewRoutes');

// ✅ REGISTER ROUTES (Check this line exists!)
app.use('/api/reviews', reviewRoutes);

// 5. Other routes (if they exist)
try {
  app.use('/api/orders', require('./routes/orderRoutes'));
  console.log('✅ Order routes loaded: /api/orders');
} catch (error) {
  console.log('⚠️ Order routes not found, skipping...');
}

try {
  app.use('/api/reviews', require('./routes/reviewRoutes'));
  console.log('✅ Review routes loaded: /api/reviews');
} catch (error) {
  console.log('⚠️ Review routes not found, skipping...');
}

// ✅ FIX 7: Add wishlist test endpoint
app.get('/api/wishlist-test', (req, res) => {
  res.json({
    success: true,
    message: 'Wishlist endpoint is working!',
    cors: 'enabled',
    allowed_origin: 'http://localhost:3000'
  });
});

// Add before other routes
app.get('/api/reviews-test', (req, res) => {
  res.json({
    success: true,
    message: 'Reviews API is working',
    endpoints: [
      'POST /api/reviews - Create review (public)',
      'GET /api/reviews/product/:productId - Get product reviews',
      'GET /api/reviews/test - Test endpoint'
    ]
  });
});

// ✅ FIX 8: Special test for CORS preflight
app.options('/api/wishlist', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running!',
    routes: {
      auth: '/api/auth',
      products: '/api/products',
      wishlist: '/api/wishlist',
      orders: '/api/orders',
      wishlist_test: '/api/wishlist-test'
    }
  });
});

// ✅ FIX 9: 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`❤️ Wishlist test: http://localhost:${PORT}/api/wishlist-test`);
  console.log(`🔧 CORS enabled for: http://localhost:3000`);
});
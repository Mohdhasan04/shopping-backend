const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check for token in cookies (if you use cookies)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided'
      });
    }

    try {
      // ✅ FIXED: Use JWT_SECRET from .env (same as authController.js)
      const jwtSecret = process.env.JWT_SECRET || 'organic-beauty-secret-key-2024-change-this';
      
      console.log('🔐 Verifying token with secret:', jwtSecret.substring(0, 10) + '...');
      
      // Verify token
      const decoded = jwt.verify(token, jwtSecret);
      
      console.log('✅ Token decoded successfully:', {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email
      });
      
      // Get user from database directly
      const [users] = await db.execute(
        'SELECT id, name, email, role, customer_email FROM users WHERE id = ?',
        [decoded.id]
      );

      if (users.length === 0) {
        console.error('❌ User not found for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User not found or token invalid'
        });
      }

      // Attach user to request
      req.user = {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role,
        customer_email: users[0].customer_email || users[0].email
      };
      
      console.log(`✅ Authenticated user: ${req.user.name} (${req.user.role})`);
      next();
      
    } catch (error) {
      console.error('❌ Token verification error:', error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server authentication error'
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    console.log(`👑 Admin access granted to: ${req.user.name}`);
    next();
  } else {
    console.log(`⛔ Admin access denied to: ${req.user ? req.user.name : 'unknown'}`);
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
};

// Optional: Customer-only middleware
const customer = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    console.log(`🛍️ Customer access: ${req.user.name}`);
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access restricted to customers only'
    });
  }
};

module.exports = { protect, admin, customer };
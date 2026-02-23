// controllers/authController.js - FIXED VERSION
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// ✅ FIXED: Generate JWT Token with CONSISTENT secret
const generateToken = (id, role, name, email) => {
  // ✅ Use same secret as authMiddleware.js
  const jwtSecret = process.env.JWT_SECRET || 'organic-beauty-secret-key-2024-change-this';
  
  console.log('🔐 Generating token with secret:', jwtSecret.substring(0, 10) + '...');
  console.log('📝 Token payload:', { id, role, name, email });
  
  const token = jwt.sign(
    { 
      id: id, 
      role: role,
      name: name,
      email: email 
    }, 
    jwtSecret,
    { expiresIn: '30d' }
  );
  
  console.log('✅ Token generated successfully:', token.substring(0, 30) + '...');
  
  return token;
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
  try {
    console.log('📝 Register user called');
    console.log('📋 Request body:', req.body);
    
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // ✅ PLAIN TEXT PASSWORD - NO HASHING
    console.log('🔓 Storing PLAIN TEXT password:', password);
    
    // Create user with plain text password
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, password, phone || null, 'user']
    );

    // Get created user
    const [users] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    const user = users[0];
    console.log('✅ User created successfully:', user.email);

    // ✅ FIXED: Generate token with all required parameters
    const token = generateToken(user.id, user.role, user.name, user.email);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user,
      token: token
    });

  } catch (error) {
    console.error('💥 Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration: ' + error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    console.log('🔐 Login function called - PLAIN TEXT ONLY');
    
    const { email, password } = req.body;
    
    console.log('📧 Login attempt for:', email);
    console.log('🔑 Password entered:', password);

    // Check if user exists
    console.log('🔍 Querying database for user...');
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    console.log('👤 Users found:', users.length);
    
    if (users.length === 0) {
      console.log('❌ User not found in database');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];
    console.log('👤 User found:', user.name, 'Role:', user.role);
    console.log('🔑 Password in database:', user.password);

    // ✅ SIMPLE PLAIN TEXT COMPARISON - NO HASHING
    if (password !== user.password) {
      console.log('❌ Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('🎉 Login successful for user:', user.name);

    // ✅ FIXED: Generate token with all 4 parameters
    const token = generateToken(user.id, user.role, user.name, user.email);
    console.log('✅ Token generated for user:', user.name);

    // Remove password from response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      created_at: user.created_at
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login: ' + error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    console.log('👤 GetMe called for user ID:', req.user.id);
    
    const [users] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    console.log('📝 Update profile called for user:', req.user.id);
    console.log('📋 Update data:', req.body);
    
    const userId = req.user.id;
    const { name, email, phone, address, city, state, zipCode } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email is already in use (by another user)
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use by another account'
      });
    }
    
    // Update user in database
    const [result] = await db.execute(
      `UPDATE users 
       SET name = ?, email = ?, phone = ?, 
           address = ?, city = ?, state = ?, zip_code = ?
       WHERE id = ?`,
      [
        name, 
        email, 
        phone || null,
        address || null,
        city || null,
        state || null,
        zipCode || null,
        userId
      ]
    );
    
    console.log('✅ Update successful, affected rows:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Fetch updated user
    const [users] = await db.execute(
      `SELECT id, name, email, phone, address, city, state, zip_code as zipCode, role, created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    console.log('🔐 Change password called for user:', req.user.id);
    
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // 1. Get user current password
    const [users] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const user = users[0];
    
    // 2. Verify current password - PLAIN TEXT
    if (currentPassword !== user.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    // 3. Store new password as PLAIN TEXT
    await db.execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPassword, userId]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    });
  }
};

// Export all functions
module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword
};
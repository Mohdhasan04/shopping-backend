// models/User.js - SINGLE PLAIN TEXT VERSION
const db = require('../config/db');

class User {
    static async create(userData) {
        try {
            const { name, email, password } = userData;
            console.log('📝 Creating user with PLAIN TEXT:', email);
            
            // ✅ PLAIN TEXT - NO HASHING
            const [result] = await db.execute(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, password] // Plain text
            );
            
            console.log('✅ User created with ID:', result.insertId);
            return result.insertId;
        } catch (error) {
            console.error('❌ User.create error:', error);
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            console.log('🔍 Finding user by email:', email);
            const [users] = await db.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            console.log('📊 Users found:', users.length);
            return users[0];
        } catch (error) {
            console.error('❌ User.findByEmail error:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            console.log('🔍 Finding user by ID:', id);
            const [users] = await db.query(
                'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
                [id]
            );
            return users[0];
        } catch (error) {
            console.error('❌ User.findById error:', error);
            throw error;
        }
    }

    static async comparePassword(enteredPassword, storedPassword) {
        try {
            console.log('🔐 Comparing passwords (PLAIN TEXT)...');
            console.log('   Entered:', enteredPassword);
            console.log('   Stored:', storedPassword);
            
            // ✅ PLAIN TEXT COMPARISON ONLY
            const result = enteredPassword === storedPassword;
            console.log('✅ Plain text match:', result);
            return result;
        } catch (error) {
            console.error('❌ Password comparison error:', error);
            return false;
        }
    }
}

module.exports = User;
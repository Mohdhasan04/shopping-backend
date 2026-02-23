const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'organic_beauty_db'
};

(async () => {
    try {
        console.log('🔌 Connecting to database...');
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected.');

        // 1. Add admin_notes column
        try {
            console.log('🔨 Checking admin_notes column...');
            await connection.execute(`
                ALTER TABLE returns_exchanges 
                ADD COLUMN admin_notes TEXT NULL
            `);
            console.log('✅ Added admin_notes column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ admin_notes column already exists.');
            } else {
                console.error('❌ Error adding admin_notes:', err.message);
            }
        }

        // 2. Add updated_at column
        try {
            console.log('🔨 Checking updated_at column...');
            await connection.execute(`
                ALTER TABLE returns_exchanges 
                ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ Added updated_at column.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ updated_at column already exists.');
            } else {
                console.error('❌ Error adding updated_at:', err.message);
            }
        }

        // 3. Update status ENUM
        try {
            console.log('🔨 Updating status ENUM...');
            await connection.execute(`
                ALTER TABLE returns_exchanges 
                MODIFY COLUMN status ENUM('requested', 'approved', 'rejected', 'processing', 'completed', 'cancelled') 
                DEFAULT 'requested'
            `);
            console.log('✅ Updated status ENUM.');
        } catch (err) {
            console.error('❌ Error updating status ENUM:', err.message);
        }

        console.log('🏁 Migration completed.');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('🔥 Fatal error:', err);
        process.exit(1);
    }
})();

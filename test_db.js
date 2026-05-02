const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
    console.log('Testing connection with:', {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });
        console.log('✅ Success!');
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log('Count:', rows[0].count);
        await connection.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();

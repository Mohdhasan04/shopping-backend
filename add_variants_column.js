const db = require('./config/database');

async function addVariantsColumn() {
    try {
        console.log('Adding variants column to products table...');

        // Check if column already exists
        const [columns] = await db.execute("SHOW COLUMNS FROM products LIKE 'variants'");
        if (columns.length === 0) {
            await db.execute("ALTER TABLE products ADD COLUMN variants JSON DEFAULT NULL");
            console.log('✅ Added variants column successfully.');
        } else {
            console.log('✅ variants column already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding variants column:', error);
        process.exit(1);
    }
}

addVariantsColumn();

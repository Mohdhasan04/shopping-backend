-- Create database
CREATE DATABASE IF NOT EXISTS organic_beauty_db;
USE organic_beauty_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    stock INT DEFAULT 0,
    image VARCHAR(500),
    category_id INT,
    ingredients TEXT,
    benefits TEXT,
    tags VARCHAR(500),
    rating DECIMAL(3, 2) DEFAULT 0,
    review_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    order_status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Insert initial categories
INSERT IGNORE INTO categories (name, description) VALUES
('Face Care', 'Organic skincare products for face'),
('Hair Care', 'Natural hair care solutions'),
('Body Care', 'Body care and bath products'),
('Special Care', 'Specialty organic products');

-- Insert sample organic products
INSERT IGNORE INTO products (name, description, price, original_price, stock, category_id, ingredients, benefits, tags, rating, review_count, is_featured) VALUES
(
    'Aloe Vera Gel', 
    'Pure organic aloe vera gel for soothing and hydrating skin', 
    12.99, 15.99, 25, 1,
    'Organic Aloe Vera, Vitamin E', 
    'Hydrates, Soothes, Reduces Inflammation', 
    'bestseller,organic', 4.8, 234, true
),
(
    'Organic Face Wash', 
    'Gentle organic face wash for daily cleansing', 
    18.99, 22.99, 30, 1,
    'Organic Herbs, Aloe Vera, Green Tea', 
    'Cleanses, Refreshes, Balances pH', 
    'new,organic', 4.6, 189, true
),
(
    'Neem-Turmeric Face Wash', 
    'Antibacterial face wash with neem and turmeric', 
    16.99, 19.99, 20, 1,
    'Neem, Turmeric, Tulsi', 
    'Fights Acne, Reduces Inflammation, Purifies', 
    'organic,ayurvedic', 4.7, 156, false
),
(
    'Vitamin C Face Serum', 
    'Brightening serum with organic vitamin C', 
    24.99, 29.99, 15, 1,
    'Vitamin C, Hyaluronic Acid, Organic Botanicals', 
    'Brightens, Anti-aging, Hydrates', 
    'bestseller,organic', 4.9, 312, true
),
(
    'Herbal Shampoo', 
    'Natural herbal shampoo for all hair types', 
    14.99, 17.99, 40, 2,
    'Amla, Shikakai, Bhringraj', 
    'Strengthens, Promotes Growth, Reduces Hair Fall', 
    'organic,ayurvedic', 4.5, 278, true
),
(
    'Coconut Hair Oil', 
    'Cold-pressed organic coconut oil for hair nourishment', 
    19.99, 24.99, 35, 2,
    'Organic Coconut Oil, Vitamin E', 
    'Conditions, Reduces Protein Loss, Adds Shine', 
    'bestseller,organic', 4.8, 445, true
),
(
    'Rosemary Hair Growth Oil', 
    'Stimulating hair oil with rosemary and essential oils', 
    22.99, 27.99, 18, 2,
    'Rosemary Oil, Peppermint Oil, Carrier Oils', 
    'Promotes Growth, Strengthens, Improves Circulation', 
    'new,organic', 4.7, 198, false
),
(
    'Shea Butter Body Lotion', 
    'Rich body lotion with organic shea butter', 
    21.99, 25.99, 28, 3,
    'Shea Butter, Cocoa Butter, Jojoba Oil', 
    'Deep Moisture, Softens, Repairs Skin Barrier', 
    'organic,nourishing', 4.6, 167, true
),
(
    'Coffee Body Scrub', 
    'Exfoliating scrub with organic coffee grounds', 
    17.99, 21.99, 22, 3,
    'Coffee Grounds, Coconut Oil, Brown Sugar', 
    'Exfoliates, Reduces Cellulite, Improves Circulation', 
    'bestseller,organic', 4.8, 223, true
),
(
    'Aloe Vera Soap', 
    'Gentle cleansing soap with aloe vera', 
    8.99, 11.99, 50, 3,
    'Aloe Vera, Olive Oil, Essential Oils', 
    'Moisturizes, Soothes, Gentle Cleansing', 
    'organic,gentle', 4.4, 189, false
),
-- Insert sample reviews
INSERT IGNORE INTO reviews (product_id, user_id, rating, comment) VALUES
(1, 1, 5, 'Excellent aloe vera gel! My skin feels hydrated and refreshed.'),
(1, 2, 4, 'Good product, works well but packaging could be better.'),
(2, 1, 5, 'Best organic face wash I have used. Gentle on skin.'),
(3, 2, 4, 'Neem and turmeric works great for acne-prone skin.'),
(4, 1, 5, 'Vitamin C serum brightened my complexion in just 2 weeks.'),
(5, 2, 4, 'Herbal shampoo reduced my hair fall significantly.'),
(6, 1, 5, 'Pure coconut oil, excellent for hair conditioning.'),
(7, 2, 4, 'Rosemary oil helped with hair growth, will buy again.'),
(8, 1, 5, 'Shea butter lotion is very moisturizing for dry skin.'),
(9, 2, 4, 'Coffee scrub smells amazing and exfoliates well.');

-- Update products with review count and average rating
UPDATE products p 
SET p.review_count = (
    SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id
),
p.rating = (
    SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = p.id
);

-- Create admin user (password: admin123)
INSERT IGNORE INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@organicbeauty.com', '$2a$10$8F5E8A7E6D5C4B3A2F1E0D.V9W8X7Y6Z5A4B3C2D1E0F9G8H7I6J5K4L3', 'admin');
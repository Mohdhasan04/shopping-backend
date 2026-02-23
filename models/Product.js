// server/models/Product.js
const db = require('../config/database');

class Product {
  static async findAll(filters = {}) {
    try {
      let query = `
        SELECT 
          p.*, 
          c.name as category_name
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.is_active = 1
      `;
      const params = [];

      if (filters.category) {
        let dbCategory = 'Face Care';
        if (filters.category === 'hair-care') dbCategory = 'Hair Care';
        if (filters.category === 'body-care') dbCategory = 'Body Care';

        query += ' AND c.name = ?';
        params.push(dbCategory);
      }

      if (filters.search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.featured) {
        query += ' AND p.is_featured = true';
      }

      if (filters.sort) {
        switch (filters.sort) {
          case 'price':
            query += ' ORDER BY p.price ASC';
            break;
          case 'price_desc':
            query += ' ORDER BY p.price DESC';
            break;
          case 'name':
            query += ' ORDER BY p.name ASC';
            break;
          case 'rating':
            query += ' ORDER BY p.rating DESC';
            break;
          default:
            query += ' ORDER BY p.created_at DESC';
        }
      } else {
        query += ' ORDER BY p.created_at DESC';
      }

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      console.log('📝 Product findAll query:', query);
      const [rows] = await db.execute(query, params);

      // Get images for each product
      const productsWithImages = await Promise.all(
        rows.map(async (product) => {
          const images = await this.getProductImages(product.id);
          const imageUrls = images.length > 0
            ? images.map(img => this.formatImageUrl(img.url))
            : product.image
              ? [this.formatImageUrl(product.image)]
              : ['/api/placeholder/500/500'];

          return {
            ...product,
            price: parseFloat(product.price),
            original_price: product.original_price ? parseFloat(product.original_price) : null,
            stock: parseInt(product.stock),
            rating: parseFloat(product.rating) || 0,
            review_count: parseInt(product.review_count) || 0,
            images: imageUrls,
            thumbnail: imageUrls[0],
            image: imageUrls[0],
            variants: product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : []
          };
        })
      );

      return productsWithImages;
    } catch (error) {
      console.error('❌ Product findAll error:', error);
      throw error;
    }
  }

  // ✅ UPDATED: findById with proper image URLs
  static async findById(id) {
    try {
      console.log('🔍 Finding product by ID:', id);
      const [rows] = await db.execute(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ?`,
        [id]
      );

      if (!rows[0]) return null;

      const product = rows[0];
      console.log('📦 Raw product from DB:', product);

      // Get images
      const images = await this.getProductImages(id);
      console.log('🖼️ Images from DB:', images);

      // Build image URLs
      const imageUrls = images.length > 0
        ? images.map(img => this.formatImageUrl(img.url))
        : product.image
          ? [this.formatImageUrl(product.image)]
          : ['/api/placeholder/500/500'];

      // Build response
      const productData = {
        ...product,
        // Ensure numeric values
        price: parseFloat(product.price),
        original_price: product.original_price ? parseFloat(product.original_price) : null,
        stock: parseInt(product.stock),
        rating: parseFloat(product.rating) || 0,
        review_count: parseInt(product.review_count) || 0,
        // Image fields
        image: imageUrls[0],
        images: imageUrls,
        thumbnail: imageUrls[0],
        variants: product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : []
      };

      console.log('✅ Final product data:', productData);
      return productData;
    } catch (error) {
      console.error('❌ Product findById error:', error);
      throw error;
    }
  }

  // ✅ NEW: Format image URL helper
  // server/models/Product.js - Update formatImageUrl function
  static formatImageUrl(imagePath) {
    console.log('🖼️ Formatting image URL:', imagePath);

    if (!imagePath) {
      console.log('❌ No image path, using placeholder');
      return '/api/placeholder/500/500';
    }

    // If already a full URL, return as is
    if (imagePath.startsWith('http')) {
      console.log('🌐 External URL:', imagePath);
      return imagePath;
    }

    // If starts with /api/placeholder, return as is
    if (imagePath.startsWith('/api/placeholder')) {
      console.log('📦 Placeholder image:', imagePath);
      return imagePath;
    }

    // ✅ FIX: Check if it's already a proper path
    if (imagePath.startsWith('/uploads/')) {
      console.log('✅ Already has correct /uploads/ path:', imagePath);
      return imagePath;
    }

    // If has uploads but missing starting slash
    if (imagePath.includes('uploads/')) {
      if (!imagePath.startsWith('/')) {
        const corrected = `/${imagePath}`;
        console.log('🔧 Added leading slash:', corrected);
        return corrected;
      }
      console.log('✅ Already has uploads path:', imagePath);
      return imagePath;
    }

    // Default - assume it's in uploads folder
    console.log('📁 Default to uploads folder:', `/uploads/${imagePath}`);
    return `/uploads/${imagePath}`;
  }

  static async getProductImages(productId) {
    try {
      const [images] = await db.execute(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, uploaded_at DESC',
        [productId]
      );
      return images;
    } catch (error) {
      console.error('❌ Get product images error:', error);
      return [];
    }
  }

  static async addImages(productId, imagesData) {
    try {
      console.log('🖼️ Adding images for product:', productId);
      console.log('📸 Images data:', imagesData);

      const results = [];
      let mainImageUpdated = false;

      for (const [index, img] of imagesData.entries()) {
        const [result] = await db.execute(
          'INSERT INTO product_images (product_id, url, is_main, alt_text) VALUES (?, ?, ?, ?)',
          [productId, img.url, img.is_main || false, img.alt_text || '']
        );
        results.push(result.insertId);

        // ✅ Update main product image
        if ((index === 0 || img.is_main) && !mainImageUpdated) {
          console.log('📸 Updating main product image to:', img.url);
          try {
            await db.execute(
              'UPDATE products SET image = ? WHERE id = ?',
              [img.url, productId]
            );
            mainImageUpdated = true;
            console.log('✅ Main product image updated successfully');
          } catch (updateError) {
            console.error('❌ Failed to update product image:', updateError.message);
          }
        }
      }

      console.log('✅ Images added successfully, IDs:', results);
      return results;
    } catch (error) {
      console.error('❌ Add product images error:', error);
      throw error;
    }
  }

  static async deleteImage(imageId) {
    try {
      const [result] = await db.execute(
        'DELETE FROM product_images WHERE id = ?',
        [imageId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Delete product image error:', error);
      throw error;
    }
  }

  static async updateMainImage(productId, imageId) {
    try {
      console.log('🎯 Setting main image for product:', productId, 'image:', imageId);

      // First, set all images to not main
      await db.execute(
        'UPDATE product_images SET is_main = 0 WHERE product_id = ?',
        [productId]
      );

      // Then set the selected image as main
      const [result] = await db.execute(
        'UPDATE product_images SET is_main = 1 WHERE id = ? AND product_id = ?',
        [imageId, productId]
      );

      if (result.affectedRows > 0) {
        // Get the image URL and update product's main image
        const [imageRows] = await db.execute(
          'SELECT url FROM product_images WHERE id = ?',
          [imageId]
        );

        if (imageRows.length > 0) {
          await db.execute(
            'UPDATE products SET image = ? WHERE id = ?',
            [imageRows[0].url, productId]
          );
          console.log('✅ Updated product main image to:', imageRows[0].url);
        }
      }

      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Update main image error:', error);
      throw error;
    }
  }

  static async create(productData) {
    try {
      console.log('🆕 Creating product with data:', productData);

      let category_id = 1;
      if (productData.category === 'hair-care') category_id = 2;
      if (productData.category === 'body-care') category_id = 3;
      if (productData.category === 'special-care') category_id = 4;

      const {
        name,
        description,
        price,
        original_price,
        stock = 10,
        image = 'default-product.jpg',
        ingredients = '',
        benefits = '',
        tags = '',
        is_featured = false,
        variants = []
      } = productData;

      const variantsStr = variants ? (Array.isArray(variants) ? JSON.stringify(variants) : variants) : null;

      const [result] = await db.execute(
        `INSERT INTO products 
         (name, description, price, original_price, category_id, stock, image, ingredients, benefits, tags, is_featured, variants) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, description, price, original_price || price,
          category_id, stock, image,
          ingredients, benefits, tags, is_featured, variantsStr
        ]
      );

      console.log('✅ Product created with ID:', result.insertId);
      return result.insertId;
    } catch (error) {
      console.error('❌ Product create error:', error);
      throw error;
    }
  }

  static async update(id, productData) {
    try {
      console.log('✏️ Updating product ID:', id);
      console.log('📦 Update data:', productData);

      const cleanData = {};
      Object.keys(productData).forEach(key => {
        if (productData[key] !== undefined && productData[key] !== null) {
          if (key === 'category') {
            let category_id = 1;
            if (productData.category === 'hair-care') category_id = 2;
            if (productData.category === 'body-care') category_id = 3;
            if (productData.category === 'special-care') category_id = 4;
            cleanData['category_id'] = category_id;
          } else if (key === 'images') {
            // Skip images field - handled separately
          } else if (key === 'variants') {
            cleanData['variants'] = Array.isArray(productData[key]) ? JSON.stringify(productData[key]) : productData[key];
          } else {
            cleanData[key] = productData[key];
          }
        }
      });

      console.log('🧹 Cleaned update data:', cleanData);

      if (Object.keys(cleanData).length === 0) {
        throw new Error('No valid fields to update');
      }

      const fields = [];
      const values = [];

      Object.keys(cleanData).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(cleanData[key]);
      });

      values.push(id);

      const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
      console.log('📝 Update query:', query);

      const [result] = await db.execute(query, values);
      console.log('✅ Update result - affected rows:', result.affectedRows);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Product update error:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      console.log('🗑️ Deleting product ID:', id);

      // Delete images first
      await db.execute('DELETE FROM product_images WHERE product_id = ?', [id]);

      // Then delete product
      const [result] = await db.execute(
        'DELETE FROM products WHERE id = ?',
        [id]
      );

      console.log('✅ Delete result - affected rows:', result.affectedRows);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Product delete error:', error);
      throw error;
    }
  }

  static async findByCategory(category) {
    try {
      let category_id = 1;
      if (category === 'hair-care') category_id = 2;
      if (category === 'body-care') category_id = 3;
      if (category === 'special-care') category_id = 4;

      const [rows] = await db.execute(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.category_id = ? 
         ORDER BY p.created_at DESC`,
        [category_id]
      );

      // Get images for each product
      const productsWithImages = await Promise.all(
        rows.map(async (product) => {
          const images = await this.getProductImages(product.id);
          const imageUrls = images.length > 0
            ? images.map(img => this.formatImageUrl(img.url))
            : product.image
              ? [this.formatImageUrl(product.image)]
              : ['/api/placeholder/500/500'];

          return {
            ...product,
            price: parseFloat(product.price),
            original_price: product.original_price ? parseFloat(product.original_price) : null,
            stock: parseInt(product.stock),
            rating: parseFloat(product.rating) || 0,
            review_count: parseInt(product.review_count) || 0,
            images: imageUrls,
            thumbnail: imageUrls[0],
            image: imageUrls[0],
            variants: product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : []
          };
        })
      );

      return productsWithImages;
    } catch (error) {
      console.error('❌ Product findByCategory error:', error);
      throw error;
    }
  }

  // ✅ NEW: Get featured products
  static async getFeaturedProducts(limit = 8) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.is_featured = true 
         ORDER BY p.created_at DESC 
         LIMIT ?`,
        [limit]
      );

      const productsWithImages = await Promise.all(
        rows.map(async (product) => {
          const images = await this.getProductImages(product.id);
          const imageUrls = images.length > 0
            ? images.map(img => this.formatImageUrl(img.url))
            : product.image
              ? [this.formatImageUrl(product.image)]
              : ['/api/placeholder/500/500'];

          return {
            ...product,
            price: parseFloat(product.price),
            original_price: product.original_price ? parseFloat(product.original_price) : null,
            stock: parseInt(product.stock),
            rating: parseFloat(product.rating) || 0,
            review_count: parseInt(product.review_count) || 0,
            images: imageUrls,
            thumbnail: imageUrls[0],
            image: imageUrls[0],
            variants: product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : []
          };
        })
      );

      return productsWithImages;
    } catch (error) {
      console.error('❌ Get featured products error:', error);
      return [];
    }
  }

  // ✅ NEW: Search products
  static async searchProducts(searchTerm, limit = 20) {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, c.name as category_name 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?
         ORDER BY p.created_at DESC 
         LIMIT ?`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
      );

      const productsWithImages = await Promise.all(
        rows.map(async (product) => {
          const images = await this.getProductImages(product.id);
          const imageUrls = images.length > 0
            ? images.map(img => this.formatImageUrl(img.url))
            : product.image
              ? [this.formatImageUrl(product.image)]
              : ['/api/placeholder/500/500'];

          return {
            ...product,
            price: parseFloat(product.price),
            original_price: product.original_price ? parseFloat(product.original_price) : null,
            stock: parseInt(product.stock),
            rating: parseFloat(product.rating) || 0,
            review_count: parseInt(product.review_count) || 0,
            images: imageUrls,
            thumbnail: imageUrls[0],
            image: imageUrls[0],
            variants: product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : []
          };
        })
      );

      return productsWithImages;
    } catch (error) {
      console.error('❌ Search products error:', error);
      return [];
    }
  }
}

module.exports = Product;
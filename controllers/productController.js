const Product = require('../models/Product');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// ✅ Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll(req.query);
    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
};

// ✅ Get single product
const getProductById = async (req, res) => {
  try {
    console.log('🔍 Fetching product ID:', req.params.id);
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    let images = [];
    try {
      const [imageRows] = await db.execute(
        'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id ASC',
        [req.params.id]
      );
      images = imageRows;
    } catch (imageError) {
      console.log('No images found or error:', imageError.message);
    }
    
    const productWithImages = {
      ...product,
      images: images.map(img => ({
        id: img.id,
        url: img.url,
        is_main: Boolean(img.is_main),
        alt_text: img.alt_text || product.name
      }))
    };
    
    console.log('✅ Product found with', images.length, 'images');
    
    res.json({ 
      success: true, 
      product: productWithImages 
    });
  } catch (error) {
    console.error('❌ Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching product: ' + error.message
    });
  }
};

// ✅ Create product
const createProduct = async (req, res) => {
  try {
    console.log('🔄 createProduct called with data:', req.body);
    
    const productId = await Product.create(req.body);
    const product = await Product.findById(productId);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('❌ Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product: ' + error.message
    });
  }
};

// ✅ Update product
const updateProduct = async (req, res) => {
  try {
    const updated = await Product.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    const product = await Product.findById(req.params.id);
    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product: ' + error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('🔥 REAL DELETE for product:', productId);
    
    // TEMPORARY DISABLE FOREIGN KEY CHECKS
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    // 1. Delete from product_images (has CASCADE but do it anyway)
    const [imageResult] = await db.execute(
      'DELETE FROM product_images WHERE product_id = ?',
      [productId]
    );
    console.log('🖼️ Deleted images:', imageResult.affectedRows);
    
    // 2. Check and delete from order_items
    try {
      const [orderResult] = await db.execute(
        'DELETE FROM order_items WHERE product_id = ?',
        [productId]
      );
      console.log('📦 Deleted from order_items:', orderResult.affectedRows);
    } catch (orderError) {
      console.log('⚠️ Could not delete from order_items:', orderError.message);
    }
    
    // 3. DELETE PRODUCT PERMANENTLY
    const [result] = await db.execute(
      'DELETE FROM products WHERE id = ?',
      [productId]
    );
    
    // RE-ENABLE FOREIGN KEY CHECKS
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ Product delete result:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product PERMANENTLY deleted from database',
      hardDelete: true
    });
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    
    // FALLBACK: Use is_active = 0
    try {
      await db.execute(
        'UPDATE products SET is_active = 0 WHERE id = ?',
        [req.params.id]
      );
      
      res.json({
        success: true,
        message: 'Product archived',
        softDelete: true
      });
      
    } catch (updateError) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// ✅ Upload product images
const uploadProductImages = async (req, res) => {
  try {
    const productId = req.params.id;
    console.log('🖼️ Uploading images for product ID:', productId);
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    console.log('📁 Files uploaded:', req.files.length);
    
    const imagesData = req.files.map((file, index) => {
      const imageUrl = `/uploads/${file.filename}`;
      console.log(`🖼️ Image ${index + 1}:`, file.filename, '→', imageUrl);
      
      return {
        url: imageUrl,
        is_main: index === 0,
        alt_text: `${product.name} image ${index + 1}`
      };
    });

    if (imagesData.length > 0 && imagesData[0].is_main) {
      console.log('📸 Setting main product image to:', imagesData[0].url);
      await db.execute(
        'UPDATE products SET image = ? WHERE id = ?',
        [imagesData[0].url, productId]
      );
    }

    let imageIds = [];
    for (const imageData of imagesData) {
      try {
        const [result] = await db.execute(
          'INSERT INTO product_images (product_id, url, is_main, alt_text) VALUES (?, ?, ?, ?)',
          [productId, imageData.url, imageData.is_main ? 1 : 0, imageData.alt_text]
        );
        imageIds.push(result.insertId);
        console.log('💾 Saved image to DB:', imageData.url);
      } catch (dbError) {
        console.error('❌ DB insert error:', dbError.message);
      }
    }

    const updatedProduct = await Product.findById(productId);
    
    res.json({
      success: true,
      message: `${imagesData.length} image(s) uploaded successfully`,
      images: imagesData,
      product: updatedProduct
    });

  } catch (error) {
    console.error('❌ Upload product images error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images: ' + error.message
    });
  }
};

// ✅ Get product images
const getProductImages = async (req, res) => {
  try {
    const images = await Product.getProductImages(req.params.id);
    res.json({
      success: true,
      images
    });
  } catch (error) {
    console.error('❌ Get product images error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching images'
    });
  }
};

// ✅ Delete product image (by ID) - FIXED
const deleteProductImage = async (req, res) => {
  try {
    const productId = req.params.id;  // ✅ FIXED: Use id not productId
    const imageId = req.params.imageId;
    
    console.log('🗑️ Deleting image:', { productId, imageId });
    
    const [images] = await db.execute(
      'SELECT * FROM product_images WHERE id = ? AND product_id = ?',
      [imageId, productId]
    );
    
    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    const imageToDelete = images[0];
    const isMainImage = imageToDelete.is_main === 1;
    
    const [result] = await db.execute(
      'DELETE FROM product_images WHERE id = ?',
      [imageId]
    );
    
    if (result.affectedRows > 0) {
      if (isMainImage) {
        const [otherImages] = await db.execute(
          'SELECT id, url FROM product_images WHERE product_id = ? LIMIT 1',
          [productId]
        );
        
        if (otherImages.length > 0) {
          await db.execute(
            'UPDATE product_images SET is_main = 1 WHERE id = ?',
            [otherImages[0].id]
          );
          
          await db.execute(
            'UPDATE products SET image = ? WHERE id = ?',
            [otherImages[0].url, productId]
          );
        }
      }
      
      const imagePath = path.join(__dirname, '..', 'uploads', path.basename(imageToDelete.url));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('🗑️ File deleted:', path.basename(imageToDelete.url));
      }
      
      res.json({
        success: true,
        message: 'Image deleted successfully',
        wasMainImage: isMainImage
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
  } catch (error) {
    console.error('❌ Delete product image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image: ' + error.message
    });
  }
};

// ✅ Delete product image by INDEX (0, 1, 2...) - FIXED
const deleteProductImageByIndex = async (req, res) => {
  try {
    const productId = req.params.id;  // ✅ FIXED: Use id not productId
    const { imageIndex } = req.body;
    
    console.log('🔥 Deleting by index:', { productId, imageIndex });
    
    const index = Number(imageIndex);
    
    const [images] = await db.execute(
      'SELECT id, url, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id ASC',
      [productId]
    );
    
    if (index >= images.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid index ${index}. Product has ${images.length} images.`
      });
    }
    
    const imageToDelete = images[index];
    const isMainImage = imageToDelete.is_main === 1;
    
    await db.execute('DELETE FROM product_images WHERE id = ?', [imageToDelete.id]);
    
    if (isMainImage && images.length > 1) {
      const nextIndex = (index === 0) ? 1 : 0;
      const newMain = images[nextIndex];
      
      await db.execute('UPDATE product_images SET is_main = 1 WHERE id = ?', [newMain.id]);
      await db.execute('UPDATE products SET image = ? WHERE id = ?', [newMain.url, productId]);
    }
    
    try {
      const fileName = path.basename(imageToDelete.url);
      const filePath = path.join(__dirname, '..', 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileErr) {
      console.log('File delete warning:', fileErr.message);
    }
    
    res.json({
      success: true,
      message: `Image #${index + 1} deleted${isMainImage ? ' (main replaced)' : ''}`,
      deletedIndex: index
    });
    
  } catch (error) {
    console.error('Delete by index error:', error);
    res.status(500).json({
      success: false,
      message: 'Error: ' + error.message
    });
  }
};

// ✅ Set main image - FIXED
const setMainImage = async (req, res) => {
  try {
    const productId = req.params.id;  // ✅ FIXED: Use id not productId
    const imageId = req.params.imageId;
    
    await db.execute(
      'UPDATE product_images SET is_main = 0 WHERE product_id = ?',
      [productId]
    );
    
    const [result] = await db.execute(
      'UPDATE product_images SET is_main = 1 WHERE id = ? AND product_id = ?',
      [imageId, productId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    const [imageRow] = await db.execute(
      'SELECT url FROM product_images WHERE id = ?',
      [imageId]
    );
    
    if (imageRow.length > 0) {
      await db.execute(
        'UPDATE products SET image = ? WHERE id = ?',
        [imageRow[0].url, productId]
      );
    }
    
    res.json({
      success: true,
      message: 'Main image updated successfully'
    });
  } catch (error) {
    console.error('❌ Set main image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting main image'
    });
  }
};

// ✅ Upload single product image - FIXED
const uploadSingleImage = async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const imageData = {
      url: `/uploads/${req.file.filename}`,
      is_main: false,
      alt_text: `${product.name} image`
    };

    await Product.addImages(productId, [imageData]);

    const updatedProduct = await Product.findById(productId);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image: imageData,
      product: updatedProduct
    });
  } catch (error) {
    console.error('❌ Upload single image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image: ' + error.message
    });
  }
};

// ✅ EXPORTS
module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  getProductImages,
  deleteProductImage,
  deleteProductImageByIndex,
  setMainImage,
  uploadSingleImage
};
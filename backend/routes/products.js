const express = require('express');
const router = express.Router();
const productModel = require('../models/product');
const { auth, adminAuth } = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { Readable } = require('stream');
const fastCsv = require('fast-csv');

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// @route   GET /api/products
// @desc    Get all products
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const products = await productModel.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('Error in GET /products:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await productModel.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ msg: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    console.error(`Error in GET /products/${req.params.id}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   GET /api/products/barcode/:barcode
// @desc    Get product by barcode
// @access  Private
router.get('/barcode/:barcode', auth, async (req, res) => {
  try {
    const product = await productModel.getProductByBarcode(req.params.barcode);
    if (!product) {
      return res.status(404).json({ msg: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    console.error(`Error in GET /products/barcode/${req.params.barcode}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Admin
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, category, buy_price, sell_price, quantity, barcode, description } = req.body;
    
    // Validate required fields
    if (!name || !category || !buy_price || !sell_price || quantity === undefined || !barcode) {
      return res.status(400).json({ msg: 'Veuillez remplir tous les champs obligatoires' });
    }
    
    const product = await productModel.createProduct({
      name,
      category,
      buy_price,
      sell_price,
      quantity,
      barcode,
      description: description || ''
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error in POST /products:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Admin
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, category, buy_price, sell_price, quantity, barcode, description } = req.body;
    
    // Validate required fields
    if (!name || !category || !buy_price || !sell_price || quantity === undefined || !barcode) {
      return res.status(400).json({ msg: 'Veuillez remplir tous les champs obligatoires' });
    }
    
    // Check if product exists
    const existingProduct = await productModel.getProductById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ msg: 'Produit non trouvé' });
    }
    
    const product = await productModel.updateProduct(req.params.id, {
      name,
      category,
      buy_price,
      sell_price,
      quantity,
      barcode,
      description: description || ''
    });
    
    res.json(product);
  } catch (error) {
    console.error(`Error in PUT /products/${req.params.id}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    // Check if product exists
    const existingProduct = await productModel.getProductById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ msg: 'Produit non trouvé' });
    }
    
    await productModel.deleteProduct(req.params.id);
    
    res.json({ msg: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error(`Error in DELETE /products/${req.params.id}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   GET /api/products/export
// @desc    Export products to CSV
// @access  Admin
router.get('/export/csv', adminAuth, async (req, res) => {
  try {
    const products = await productModel.getAllProducts();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    
    const csvStream = fastCsv.format({ headers: true });
    csvStream.pipe(res);
    
    products.forEach(product => {
      csvStream.write({
        ID: product.id,
        Nom: product.name,
        Catégorie: product.category,
        'Prix dachat': product.buy_price,
        'Prix de vente': product.sell_price,
        Quantité: product.quantity,
        'Code-barres': product.barcode,
        Description: product.description
      });
    });
    
    csvStream.end();
  } catch (error) {
    console.error('Error in GET /products/export/csv:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// @route   POST /api/products/import
// @desc    Import products from CSV
// @access  Admin
router.post('/import', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Aucun fichier téléchargé' });
    }
    
    const results = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', async (data) => {
        results.push(data);
      })
      .on('end', async () => {
        try {
          // Delete the uploaded file
          fs.unlinkSync(req.file.path);
          
          // Process the CSV data
          const importedCount = await processProductImport(results);
          
          res.json({ msg: `${importedCount} produits importés avec succès` });
        } catch (error) {
          console.error('Error processing CSV import:', error);
          res.status(500).json({ msg: 'Erreur lors du traitement du fichier CSV' });
        }
      });
  } catch (error) {
    console.error('Error in POST /products/import:', error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

// Helper function to process product import
async function processProductImport(data) {
  let importedCount = 0;
  
  for (const item of data) {
    try {
      // Map CSV columns to product fields
      const product = {
        name: item.Nom || item.nom || item.NAME || item.name,
        category: item.Catégorie || item.categorie || item.CATEGORY || item.category,
        buy_price: parseFloat(item['Prix dachat'] || item.Prix || item.prix || item.PRICE || item.price),
        sell_price: parseFloat(item['Prix de vente'] || item.Prix || item.prix || item.PRICE || item.price),
        quantity: parseInt(item.Quantité || item.quantite || item.QUANTITY || item.quantity),
        barcode: item['Code-barres'] || item.codebarres || item.BARCODE || item.barcode,
        description: item.Description || item.description || ''
      };
      
      // Check if product with this barcode already exists
      const existingProduct = await productModel.getProductByBarcode(product.barcode);
      
      if (existingProduct) {
        // Update existing product
        await productModel.updateProduct(existingProduct.id, product);
      } else {
        // Create new product
        await productModel.createProduct(product);
      }
      
      importedCount++;
    } catch (error) {
      console.error('Error importing product:', error);
      // Continue with next product
    }
  }
  
  return importedCount;
}

// @route   GET /api/products/low-stock/:threshold
// @desc    Get products with stock below threshold
// @access  Private
router.get('/low-stock/:threshold', auth, async (req, res) => {
  try {
    const threshold = parseInt(req.params.threshold);
    if (isNaN(threshold)) {
      return res.status(400).json({ msg: 'Le seuil doit être un nombre' });
    }
    
    const products = await productModel.getLowStockProducts(threshold);
    res.json(products);
  } catch (error) {
    console.error(`Error in GET /products/low-stock/${req.params.threshold}:`, error);
    res.status(500).json({ msg: 'Erreur serveur' });
  }
});

module.exports = router;

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize products file if it doesn't exist
async function initializeProductsFile() {
  try {
    await fs.access(PRODUCTS_FILE);
  } catch (error) {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify([], null, 2));
  }
}

// Helper function to read products
async function readProducts() {
  try {
    const data = await fs.readFile(PRODUCTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products file:', error);
    throw new Error('Could not read products data');
  }
}

// Helper function to write products
async function writeProducts(products) {
  try {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error('Error writing to products file:', error);
    throw new Error('Could not update products data');
  }
}

// GET all products
app.get('/products', async (req, res) => {
  try {
    const products = await readProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET in-stock products
app.get('/products/instock', async (req, res) => {
  try {
    const products = await readProducts();
    const inStockProducts = products.filter(product => product.inStock === true);
    res.json(inStockProducts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single product by ID
app.get('/products/:id', async (req, res) => {
  try {
    const products = await readProducts();
    const product = products.find(p => p.id === parseInt(req.params.id));
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new product
app.post('/products', async (req, res) => {
  try {
    const { name, price, inStock } = req.body;
    
    if (!name || price === undefined || inStock === undefined) {
      return res.status(400).json({ error: 'Name, price, and inStock are required' });
    }
    
    const products = await readProducts();
    const newProduct = {
      id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
      name,
      price: Number(price),
      inStock: Boolean(inStock)
    };
    
    products.push(newProduct);
    await writeProducts(products);
    
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update a product
app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, inStock } = req.body;
    
    const products = await readProducts();
    const productIndex = products.findIndex(p => p.id === parseInt(id));
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const updatedProduct = {
      ...products[productIndex],
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(inStock !== undefined && { inStock: Boolean(inStock) })
    };
    
    products[productIndex] = updatedProduct;
    await writeProducts(products);
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a product
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const products = await readProducts();
    const initialLength = products.length;
    
    const filteredProducts = products.filter(p => p.id !== parseInt(id));
    
    if (filteredProducts.length === initialLength) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    await writeProducts(filteredProducts);
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
async function startServer() {
  await initializeProductsFile();
  
  // Create sample data if the file is empty
  const products = await readProducts();
  if (products.length === 0) {
    const sampleProducts = [
      { id: 1, name: 'Laptop', price: 60000, inStock: true },
      { id: 2, name: 'Mouse', price: 800, inStock: true }
    ];
    await writeProducts(sampleProducts);
  }
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

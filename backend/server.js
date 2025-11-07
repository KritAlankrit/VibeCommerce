const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// pull in env variables
require('dotenv').config();

// Setup express
const app = express();
const PORT = process.env.PORT || 5001; // Use port 5001 for backend

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(express.json()); // allow json request bodies

// --- MongoDB Connection ---
// DB connection string. Falls back to local if .env is missing.
const MONGO_URI = process.env.MONGO_URI

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully.');
    // run seeder after connecting
    seedDatabase();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// --- Schemas ---

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
});
const Product = mongoose.model('Product', productSchema);

// Cart Item Schema
const cartItemSchema = new mongoose.Schema({
  // Store a ref to the product, not the whole object
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
});
const CartItem = mongoose.model('CartItem', cartItemSchema);


// --- Database Seeding (Mock Data) ---
const MOCK_PRODUCTS = [
  { name: 'Classic Vibe Tee', price: 25.00, image: 'https://placehold.co/400x400/2D3748/E2E8F0?text=Vibe+Tee' },
  { name: 'Retro Vibe Hoodie', price: 55.00, image: 'https://placehold.co/400x400/4A5568/E2E8F0?text=Vibe+Hoodie' },
  { name: 'Vibe Snapback Cap', price: 18.50, image: 'https://placehold.co/400x400/718096/E2E8F0?text=Vibe+Cap' },
  { name: 'Aesthetic Vibe Mug', price: 12.99, image: 'https://placehold.co/400x400/2D3748/E2E8F0?text=Vibe+Mug' },
  { name: 'Vibe-On-The-Go Tumbler', price: 22.00, image: 'https://placehold.co/400x400/4A5568/E2E8F0?text=Vibe+Tumbler' },
  { name: 'Minimalist Vibe Print', price: 30.00, image: 'https://placehold.co/400x400/718096/E2E8F0?text=Vibe+Print' },
];

// check if db is empty, then seed
async function seedDatabase() {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('No products found. Seeding database...');
      await Product.insertMany(MOCK_PRODUCTS);
      console.log('Database seeded with mock products.');
    } else {
      console.log('Database already contains products. Skipping seed.');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

// --- API Endpoints ---

// GET /api/products - fetch all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching products.' });
  }
});

// GET /api/cart - get all cart items + total
app.get('/api/cart', async (req, res) => {
  try {
    // populate() is key - it swaps the product ID for the full product doc
    const cartItems = await CartItem.find({}).populate('product');

    // Calculate total price
    const total = cartItems.reduce((acc, item) => {
      // safety check in case product was deleted but still in cart
      if (item.product) {
        return acc + (item.product.price * item.quantity);
      }
      return acc;
    }, 0);

    res.json({ cartItems, total: parseFloat(total.toFixed(2)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while fetching cart.' });
  }
});


// POST /api/cart - add/update item quantity
app.post('/api/cart', async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ message: 'Invalid input. Product ID and quantity > 0 required.' });
  }

  try {
    // check if item already in cart
    let cartItem = await CartItem.findOne({ product: productId });

    if (cartItem) {
      // item exists, update qty
      cartItem.quantity = quantity;
      await cartItem.save();
    } else {
      // new item, create it
      // first, check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found.' });
      }
      cartItem = new CartItem({
        product: productId,
        quantity: quantity
      });
      await cartItem.save();
    }

    // Respond with the updated item
    const populatedItem = await CartItem.findById(cartItem._id).populate('product');
    res.status(201).json(populatedItem);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while adding to cart.' });
  }
});


// DELETE /api/cart/:id - remove item from cart
app.delete('/api/cart/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedItem = await CartItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    res.json({ message: 'Item removed from cart.', removedItem: deletedItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while removing from cart.' });
  }
});

// POST /api/checkout - mock checkout
app.post('/api/checkout', async (req, res) => {
  // real app would have payment processing here (stripe, etc)
  // here, we'll just clear the cart and return a receipt.

  try {
    // get cart contents for final total
    const cartItems = await CartItem.find({}).populate('product');
    const total = cartItems.reduce((acc, item) => {
      if (item.product) {
        return acc + (item.product.price * item.quantity);
      }
      return acc;
    }, 0);

    // ! - clear cart after checkout
    await CartItem.deleteMany({});

    // send back a receipt
    res.json({
      success: true,
      message: 'Checkout successful! Thank you for your order.',
      order: {
        items: cartItems.map(item => ({
          name: item.product ? item.product.name : 'Unknown Item',
          quantity: item.quantity,
          price: item.product ? item.product.price : 0
        })),
        total: parseFloat(total.toFixed(2)),
        orderId: new mongoose.Types.ObjectId().toString(), // fake order ID
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during checkout.' });
  }
});


// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Trash2, X, Loader2, Minus, Plus, CreditCard, ShoppingBag } from 'lucide-react';


// API client setup
const apiClient = axios.create({
  baseURL: 'http://localhost:5001/api'
});

export default function App() {
  // Main app state
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(null); // Will hold { cartItems: [], total: 0 }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Initial data load (products + cart)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // fetch all data at once
        const [productsResponse, cartResponse] = await Promise.all([
          apiClient.get('/products'),
          apiClient.get('/cart')
        ]);
        
        setProducts(productsResponse.data);
        setCart(cartResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load store. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []); // [] means run once on mount

  // === CART ACTIONS ===

  const handleAddToCart = async (productId, quantity = 1) => {
    try {
      // check if item already in cart to update qty
      const existingItem = cart.cartItems.find(item => item.product._id === productId);
      const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;

      // update or add item
      await apiClient.post('/cart', { productId, quantity: newQuantity });
      
      // refetch cart to sync state
      const cartResponse = await apiClient.get('/cart');
      setCart(cartResponse.data);
      
      // pop open the cart
      setIsCartOpen(true);
      
    } catch (err) {
      console.error("Error adding to cart:", err);
      setError("Failed to add item to cart.");
    }
  };

  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    // newQuantity < 1? just remove it
    if (newQuantity < 1) {
      handleRemoveFromCart(cartItemId);
      return;
    }

    try {
      // Find the item to get its product ID
      const itemToUpdate = cart.cartItems.find(item => item._id === cartItemId);
      if (!itemToUpdate) return;
      
      // API call
      await apiClient.post('/cart', { productId: itemToUpdate.product._id, quantity: newQuantity });
      
      // refetch cart
      const cartResponse = await apiClient.get('/cart');
      setCart(cartResponse.data);
      
    } catch (err) {
      console.error("Error updating quantity:", err);
      setError("Failed to update cart.");
    }
  };

  const handleRemoveFromCart = async (cartItemId) => {
    try {
      await apiClient.delete(`/cart/${cartItemId}`);
      
      // refetch cart
      const cartResponse = await apiClient.get('/cart');
      setCart(cartResponse.data);
      
    } catch (err) {
      console.error("Error removing from cart:", err);
      setError("Failed to remove item.");
    }
  };

  const handleCheckout = () => {
    if (cart.cartItems.length === 0) return;
    setIsCartOpen(false);
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (formData) => {
    try {
      // call checkout endpoint
      const receipt = await apiClient.post('/checkout', {
        customer: formData,
        cartItems: cart.cartItems,
      });

      // clear cart on success
      setIsCheckoutModalOpen(false);
      setCart({ cartItems: [], total: 0 }); // clear locally
      
      // temp alert, replace with toast or success page
      alert(`Checkout Successful! Order ID: ${receipt.data.order.orderId}`);
      
    } catch (err) {
      console.error("Error during checkout:", err);
      setError("Checkout failed. Please try again.");
    }
  };
  
  // === RENDER ===

  // Loading state
  if (loading) {
    return <GlobalSpinner />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay message={error} />;
  }

  // Main App
  return (
    <div className="min-h-screen font-sans">
      <Header
        cartItemCount={cart?.cartItems?.length || 0}
        onCartClick={() => setIsCartOpen(true)}
      />

      {/* Product Grid */}
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Welcome to the Vibe
        </h1>
        <ProductGrid
          products={products}
          onAddToCart={handleAddToCart}
        />
      </main>

      <CartSidebar
        isOpen={isCartOpen}
        cart={cart}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCheckout}
      />

      {isCheckoutModalOpen && (
        <CheckoutModal
          total={cart.total}
          onClose={() => setIsCheckoutModalOpen(false)}
          onSubmit={handleCheckoutSubmit}
        />
      )}
    </div>
  );
}

// === COMPONENTS ===
// Breaking out components for readability

function Header({ cartItemCount, onCartClick }) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-lg sticky top-0 z-50">
      <nav className="container mx-auto max-w-7xl px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 text-2xl font-bold text-white tracking-tight">
          <ShoppingBag className="text-indigo-400" size={28} />
          <div>
            <span className="text-indigo-400">Vibe</span>Commerce
          </div>
        </div>
        <button
          onClick={onCartClick}
          className="relative rounded-full p-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          aria-label="Open cart"
        >
          <ShoppingCart size={24} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {cartItemCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}

function ProductGrid({ products, onAddToCart }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

function ProductCard({ product, onAddToCart }) {
  const [isAdding, setIsAdding] = useState(false);

  const handleClick = async () => {
    setIsAdding(true);
    await onAddToCart(product._id);
    setIsAdding(false);
  };

  return (
    <div className="group bg-gray-800/70 border border-gray-700 rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-indigo-500/20 hover:border-gray-600">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-110"
        // img fallback
        onError={(e) => { e.target.src = 'https://placehold.co/400x400?text=Image+Missing'; }}
      />
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-white mb-2">{product.name}</h3>
        <p className="text-xl font-bold text-indigo-400 mb-4">${product.price.toFixed(2)}</p>
        
        <button
          onClick={handleClick}
          disabled={isAdding}
          className="mt-auto w-full flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold py-2 px-4 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed transform translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0"
        >
          {isAdding ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <ShoppingCart size={20} className="mr-2" />
          )}
          {isAdding ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

function CartSidebar({ isOpen, cart, onClose, onUpdateQuantity, onRemoveItem, onCheckout }) {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-50 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-800 shadow-2xl z-50 transform transition-transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Cart Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white">Your Cart</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"
              aria-label="Close cart"
            >
              <X size={24} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-grow p-5 overflow-y-auto">
            {cart && cart.cartItems.length > 0 ? (
              <ul className="divide-y divide-gray-700">
                {cart.cartItems.map((item) => (
                  <CartItem
                    key={item._id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemoveItem={onRemoveItem}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart size={64} className="mb-4" />
                <p className="text-xl">Your cart is empty.</p>
              </div>
            )}
          </div>

          {/* Cart Footer */}
          {cart && cart.cartItems.length > 0 && (
            <div className="p-5 border-t border-gray-700 bg-gray-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium text-gray-300">Subtotal:</span>
                <span className="text-2xl font-bold text-white">
                  ${cart.total.toFixed(2)}
                </span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CartItem({ item, onUpdateQuantity, onRemoveItem }) {
  // safety check for deleted products
  if (!item.product) {
    return null; 
  }
  
  return (
    <li className="flex py-4 px-2 hover:bg-gray-700/50 rounded-lg transition-colors">
      <img
        src={item.product.image}
        alt={item.product.name}
        className="w-20 h-20 rounded-lg object-cover"
      />
      <div className="ml-4 flex-grow">
        <h4 className="text-lg font-semibold text-white">{item.product.name}</h4>
        <p className="text-sm text-gray-400">${item.product.price.toFixed(2)}</p>
        <div className="flex items-center justify-between mt-2">
          {/* Qty buttons */}
          <div className="flex items-center border border-gray-700 rounded-md">
            <button
              onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
              className="p-1 text-gray-400 hover:text-white"
            >
              <Minus size={16} />
            </button>
            <span className="px-3 text-white font-medium">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
              className="p-1 text-gray-400 hover:text-white"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={() => onRemoveItem(item._id)}
            className="text-red-400 hover:text-red-300"
            aria-label="Remove item"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </li>
  );
}

function CheckoutModal({ total, onClose, onSubmit }) {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Checkout</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="john.doe@example.com"
            />
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium text-gray-300">Total:</span>
              <span className="text-2xl font-bold text-white">${total.toFixed(2)}</span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center bg-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-300 disabled:bg-gray-500"
            >
              {isSubmitting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <CreditCard size={24} className="mr-2" />
              )}
              {isSubmitting ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Utility Components ---

function GlobalSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={48} className="animate-spin text-indigo-400" />
    </div>
  );
}

function ErrorDisplay({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4">
      <X size={64} className="text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">An Error Occurred</h2>
      <p className="text-gray-400">{message}</p>
    </div>
  );
}
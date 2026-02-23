import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '@/data/products';

interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size?: string, color?: string) => void;
  removeFromCart: (productId: string, size?: string, color?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const matchItem = (item: CartItem, productId: string, size?: string, color?: string) =>
  item.product.id === productId && item.selectedSize === size && item.selectedColor === color;

export const CartProvider: React.FC<{ children: React.ReactNode; storageKey?: string }> = ({ children, storageKey }) => {
  const key = storageKey || 'cart_default';

  const [items, setItems] = useState<CartItem[]>(() => {
    if (!storageKey) return [];
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && item.product && typeof item.quantity === 'number');
    } catch {
      localStorage.removeItem(key);
      return [];
    }
  });

  // Persist to localStorage when storageKey is provided
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  }, [items, key, storageKey]);

  const addToCart = useCallback((product: Product, size?: string, color?: string) => {
    setItems(prev => {
      const existing = prev.find(item => matchItem(item, product.id, size, color));
      if (existing) {
        return prev.map(item =>
          matchItem(item, product.id, size, color)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedSize: size, selectedColor: color }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, size?: string, color?: string) => {
    setItems(prev => prev.filter(item => !matchItem(item, productId, size, color)));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, size?: string, color?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        matchItem(item, productId, size, color) ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    if (storageKey) localStorage.removeItem(key);
  }, [key, storageKey]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const totalInReais = totalPrice / 100;
  const discountPercent = totalInReais > 350 ? 50 : totalInReais > 300 ? 45 : totalInReais > 250 ? 40 : totalInReais > 200 ? 30 : totalInReais > 150 ? 25 : totalInReais > 100 ? 20 : 0;
  const discountAmount = Math.round(totalPrice * discountPercent / 100);
  const finalPrice = totalPrice - discountAmount;

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      totalItems, totalPrice, discountPercent, discountAmount, finalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// src/context/CartContext.jsx — корзина (ЛР13): хранится в состоянии React и в localStorage
import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'cart';

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return []; // в localStorage мусор — начинаем с пустой корзины, а не падаем
  }
}

export function CartProvider({ children }) {
  // позиция корзины: { productId, name, price, quantity }; price — только для показа,
  // сумму заказа считает сервер по ценам из базы
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // setItems((prev) => …): два быстрых клика «В корзину» дадут 2, а не 1
  function add(product) {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === product.id);
      if (found) {
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function setQuantity(productId, quantity) {
    setItems((prev) => (quantity <= 0
      ? prev.filter((i) => i.productId !== productId)
      : prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))));
  }

  const clear = () => setItems([]);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, setQuantity, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- хук живёт рядом со своим провайдером
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart() вызван вне <CartProvider>');
  return ctx;
}

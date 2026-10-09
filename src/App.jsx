import { useState, useEffect } from 'react';
import ProductCard from './components/ProductCard';

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // [] — выполнить один раз, при первом появлении компонента
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch('http://localhost:3001/products');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch {
        setError('Не удалось загрузить товары');
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Счётчик — общие данные приложения, поэтому состояние живёт в App,
  // а карточки только сообщают о клике (lifting state up)
  function handleAddToCart() {
    setCartCount(cartCount + 1);
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="app">
      <div className="header">
        <div className="logo">🌾 АгроМаркет</div>
        <div className="cart">🛒 Корзина: {cartCount}</div>
      </div>

      <div className="catalog">
        <h2>Каталог</h2>
        <input
          type="text"
          placeholder="Поиск товара..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading && <p>Загрузка...</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={handleAddToCart} />
        ))}
      </div>
    </div>
  );
}

export default App;

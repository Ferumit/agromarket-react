import { useState, useEffect } from 'react';
import ProductCard from './components/ProductCard';
import Header from './components/Header';
import Footer from './components/Footer';
import ContactForm from './components/ContactForm';

const API_URL = 'http://localhost:3000/api';

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
        // было: fetch('http://localhost:3001/products') — json-server
        const response = await fetch(`${API_URL}/products`);
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
    <>
      <Header cartCount={cartCount} />
      <main className="page">
        <section id="catalog" className="catalog">
          <div className="catalog-toolbar">
            <h2>Каталог</h2>
            <input
              type="search"
              placeholder="Поиск товара..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading && <p>Загрузка...</p>}
          {error && <p className="error">{error}</p>}
          <div className="product-grid">
            {!loading && !error && filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={handleAddToCart}
                // id может прийти числом или строкой (json-server 1.x), поэтому через String
                featured={String(product.id) === '1'}
              />
            ))}
          </div>
        </section>

        <aside id="delivery" className="sidebar">
          <h3>Доставка</h3>
          <ul>
            <li>Астана — на следующий день</li>
            <li>Акмолинская область — 2–3 дня</li>
            <li>Бесплатно от 20 000 тг</li>
          </ul>
        </aside>

        <ContactForm />
      </main>
      <Footer />
    </>
  );
}

export default App;

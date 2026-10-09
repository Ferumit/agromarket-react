import { useState, useEffect } from 'react';
import ProductCard from './components/ProductCard';
import Header from './components/Header';
import Footer from './components/Footer';
import ContactForm from './components/ContactForm';
import LoginForm from './components/LoginForm.jsx';
import AddProductForm from './components/AddProductForm.jsx';
import AdminOrders from './components/AdminOrders.jsx';
import { API_URL, apiFetch } from './api.js';

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Ленивая инициализация: localStorage читается один раз, при первом рендере
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem('user') || 'null')
  );

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

  // В localStorage может лежать истёкший токен — спрашиваем сервер, кто мы
  useEffect(() => {
    if (!localStorage.getItem('token')) return; // не входили — проверять нечего
    // при 401 apiFetch сам выполнит выход, поэтому ошибку просто глушим
    apiFetch('/auth/me').then(setUser).catch(() => {});
  }, []);

  function handleLogin(user, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // Счётчик — общие данные приложения, поэтому состояние живёт в App,
  // а карточки только сообщают о клике (lifting state up)
  function handleAddToCart() {
    setCartCount(cartCount + 1);
  }

  // Бонус ЛР7: удаление товара администратором
  async function handleDeleteProduct(product) {
    if (!confirm(`Удалить товар «${product.name}»?`)) return;
    try {
      await apiFetch(`/products/${product.id}`, { method: 'DELETE' });
      setProducts(products.filter((p) => p.id !== product.id));
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  }

  const isAdmin = user?.role === 'admin';

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <Header cartCount={cartCount} />
      <main className="page">
        <section id="catalog" className="catalog">
          {isAdmin && (
            <AddProductForm onAdded={(p) => setProducts([...products, p])} />
          )}

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
                onDelete={isAdmin ? handleDeleteProduct : undefined}
              />
            ))}
          </div>
        </section>

        <div className="sidebar-column">
          <section id="account" className="sidebar auth-bar">
            {user ? (
              <>
                <span>Вы вошли как <b>{user.name}</b> ({user.role})</span>
                <button onClick={handleLogout}>Выйти</button>
              </>
            ) : (
              <LoginForm onLogin={handleLogin} />
            )}
          </section>

          <aside id="delivery" className="sidebar">
            <h3>Доставка</h3>
            <ul>
              <li>Астана — на следующий день</li>
              <li>Акмолинская область — 2–3 дня</li>
              <li>Бесплатно от 20 000 тг</li>
            </ul>
          </aside>
        </div>

        <ContactForm products={products} />

        {isAdmin && <AdminOrders />}
      </main>
      <Footer />
    </>
  );
}

export default App;

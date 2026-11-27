import { useState, useEffect } from 'react';
import { Route, Routes } from 'react-router';
import ProductCard from './components/ProductCard';
import Header from './components/Header';
import Footer from './components/Footer';
import ContactForm from './components/ContactForm';
import LoginForm from './components/LoginForm.jsx';
import AddProductForm from './components/AddProductForm.jsx';
import AdminOrders from './components/AdminOrders.jsx';
import { API_URL, SESSION_EXPIRED, apiFetch } from './api.js';
import CartPage from './pages/CartPage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import IncomingOrdersPage from './pages/IncomingOrdersPage.jsx';

function App() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Ленивая инициализация: localStorage читается один раз, при первом рендере
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem('user') || 'null')
  );
  const [sessionExpired, setSessionExpired] = useState(false);

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

  // apiFetch получил 401 на запрос с токеном — выходим из аккаунта
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setSessionExpired(true);
    }
    window.addEventListener(SESSION_EXPIRED, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED, handleSessionExpired);
  }, []);

  // В localStorage может лежать истёкший токен — спрашиваем сервер, кто мы
  useEffect(() => {
    if (!localStorage.getItem('token')) return; // не входили — проверять нечего
    // при 401 apiFetch сам сообщит о выходе (SESSION_EXPIRED), поэтому ошибку просто глушим
    apiFetch('/auth/me').then(setUser).catch(() => {});
  }, []);

  function handleLogin(user, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    setSessionExpired(false);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
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

  // ЛР13: остаток задают владелец товара или администратор
  async function handleStockSave(product, stock) {
    try {
      const updated = await apiFetch(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock }),
      });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  }

  const isAdmin = user?.role === 'admin';
  const isFarmer = user?.role === 'farmer';
  // Товар меняет администратор (любой) или фермер (только свой, ЛР13)
  const canManage = (product) => isAdmin || (isFarmer && product.farmer_id === user.id);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const home = (
      <main className="page">
        <section id="catalog" className="catalog">
          {(isAdmin || isFarmer) && (
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
          {/* role="alert": экранный диктор сразу прочитает ошибку (нашёл тест ЛР12) */}
          {error && <p className="error" role="alert">{error}</p>}
          {!loading && !error && products.length === 0 && <p>Товаров пока нет</p>}
          {!loading && !error && products.length > 0 && filteredProducts.length === 0 && (
            <p>По запросу «{searchTerm}» ничего не найдено</p>
          )}
          <div className="product-grid">
            {!loading && !error && filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                // id может прийти числом или строкой (json-server 1.x), поэтому через String
                featured={String(product.id) === '1'}
                onDelete={canManage(product) ? handleDeleteProduct : undefined}
                onStockSave={canManage(product) ? handleStockSave : undefined}
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
              <LoginForm
                onLogin={handleLogin}
                notice={sessionExpired ? 'Сессия истекла — войдите заново' : ''}
              />
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
  );

  // Маршруты (ЛР13). «*» — главная: прямая ссылка /admin или /login не даёт 404 (smoke ЛР12)
  return (
    <>
      <Header user={user} />
      <Routes>
        <Route path="/cart" element={<CartPage user={user} />} />
        <Route path="/orders" element={<MyOrdersPage user={user} />} />
        <Route path="/farmer/orders" element={<IncomingOrdersPage user={user} />} />
        <Route path="*" element={home} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;

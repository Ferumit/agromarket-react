import { Link } from 'react-router';
import { useCart } from '../context/CartContext.jsx';

// Пункты «Каталог», «Доставка»… — якоря на главной: с другой страницы ведут на «/» к нужному блоку
function Header({ user }) {
  const { count } = useCart(); // счётчик берём из корзины (ЛР13), а не из состояния App
  return (
    <header className="site-header">
      <Link to="/" className="logo">🌾 АгроМаркет</Link>
      <nav>
        <ul className="nav-links">
          <li><a href="/#catalog">Каталог</a></li>
          <li><a href="/#delivery">Доставка</a></li>
          <li><a href="/#contact">Контакты</a></li>
          <li><a href="/#account">Кабинет</a></li>
          {user && <li><Link to="/orders">Мои заказы</Link></li>}
          {user?.role === 'farmer' && <li><Link to="/farmer/orders">Заказы на мои товары</Link></li>}
        </ul>
      </nav>
      <Link to="/cart" className="cart">🛒 Корзина ({count})</Link>
    </header>
  );
}

export default Header;

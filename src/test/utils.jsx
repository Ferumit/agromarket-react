import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CartProvider } from '../context/CartContext.jsx';

// Компоненты с корзиной и ссылками работают только внутри провайдеров — как в main.jsx (ЛР13).
// MemoryRouter вместо BrowserRouter: адрес задаём сами (route), настоящей адресной строки нет.
// wrapper, а не обёртка вокруг ui: тогда и rerender() остаётся внутри провайдеров
export function renderWithProviders(ui, { route = '/' } = {}) {
  const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[route]}>
      <CartProvider>{children}</CartProvider>
    </MemoryRouter>
  );
  return render(ui, { wrapper });
}

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { mockApi, mockFetch, requestOf } from './test/fetch.js';

// Каталог живёт в App: он грузит товары в useEffect и показывает загрузку, данные или ошибку
const products = [
  { id: 1, name: 'Картофель', category: 'Овощи', price: 350, unit: 'кг', image: null },
  { id: 2, name: 'Мёд натуральный', category: 'Мёд', price: 4500, unit: 'кг', image: null },
  { id: 3, name: 'Молоко фермерское', category: 'Молочная продукция', price: 600, unit: 'л', image: null },
];

describe('Каталог (App)', () => {
  test('сначала показывает загрузку, потом товары', async () => {
    mockFetch(products);
    render(<App />);

    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
    // findBy ждёт, пока «придёт ответ сервера» и React перерисует экран
    expect(await screen.findByRole('heading', { name: 'Картофель' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Мёд натуральный' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.queryByText(/загрузка/i)).not.toBeInTheDocument();
  });

  test('запрашивает правильный адрес, один раз', async () => {
    const spy = mockFetch(products);
    render(<App />);
    await screen.findByRole('heading', { name: 'Картофель' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(requestOf(spy).url).toMatch(/\/api\/products$/);
  });

  test('при ошибке сервера показывает сообщение', async () => {
    mockFetch({ error: 'Внутренняя ошибка сервера' }, 500);
    render(<App />);

    expect(await screen.findByText('Не удалось загрузить товары')).toBeInTheDocument();
    expect(screen.queryByText(/загрузка/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  test('сеть недоступна — тоже сообщение, а не пустая страница', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    expect(await screen.findByText('Не удалось загрузить товары')).toBeInTheDocument();
  });

  test('сервер вернул [] — «Товаров пока нет»', async () => {
    mockFetch([]);
    render(<App />);

    expect(await screen.findByText('Товаров пока нет')).toBeInTheDocument();
  });

  test('поиск оставляет подходящие товары, а если их нет — так и пишет', async () => {
    const ui = userEvent.setup();
    mockFetch(products);
    render(<App />);
    await screen.findByRole('heading', { name: 'Картофель' });

    const search = screen.getByRole('searchbox');
    await ui.type(search, 'мол');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Молоко фермерское' })).toBeInTheDocument();

    await ui.clear(search);
    await ui.type(search, 'арбуз');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText(/ничего не найдено/i)).toBeInTheDocument();
  });
});

describe('Вход (App)', () => {
  test('токен истёк: сервер ответил 401 — показывается форма входа и «войдите заново»', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ id: 7, name: 'Фермер', role: 'user' }));
    const spy = mockApi({
      '/auth/me': [401, { error: 'Срок действия токена истёк, войдите снова' }],
      '/products': [200, products],
    });
    render(<App />);

    // Пока сервер не ответил, App верит localStorage
    expect(screen.getByText(/вы вошли как/i)).toBeInTheDocument();

    expect(await screen.findByText(/войдите заново/i)).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByText(/вы вошли как/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();

    const me = spy.mock.calls.findIndex(([url]) => String(url).endsWith('/auth/me'));
    expect(requestOf(spy, me).headers.get('Authorization')).toBe('Bearer expired-token');
  });

  test('после входа — «Вы вошли как …», токен сохранён; «Выйти» возвращает форму', async () => {
    const ui = userEvent.setup();
    const farmer = { id: 7, name: 'Фермер', email: 'farmer@agromarket.kz', role: 'user' };
    mockApi({
      '/auth/login': [200, { user: farmer, token: 'jwt-token' }],
      '/products': [200, products],
    });
    render(<App />);

    // «Email» на странице два (вход и заявка) — ищем внутри формы «Вход»
    const loginForm = screen.getByRole('form', { name: 'Вход' });
    await ui.type(within(loginForm).getByLabelText('Email'), farmer.email);
    await ui.type(within(loginForm).getByLabelText('Пароль'), 'secret123');
    await ui.click(within(loginForm).getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText(/вы вошли как/i)).toHaveTextContent('Вы вошли как Фермер (user)');
    expect(localStorage.getItem('token')).toBe('jwt-token');
    // покупателю админ-панель не показывается
    expect(screen.queryByRole('heading', { name: 'Новый товар' })).not.toBeInTheDocument();

    await ui.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
  });
});

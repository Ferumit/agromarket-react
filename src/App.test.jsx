import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import App from './App';
import { renderWithProviders } from './test/utils.jsx';
import { server, recordRequests } from './test/server.js';
import { farmer, PASSWORD, TOKEN } from './test/handlers.js';

// Каталог живёт в App: он грузит товары в useEffect и показывает загрузку, данные или ошибку.
// API подменяет MSW (src/test/handlers.js): по умолчанию — три товара
describe('Каталог (App)', () => {
  test('сначала показывает загрузку, потом товары', async () => {
    renderWithProviders(<App />);

    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
    // findBy ждёт, пока «придёт ответ сервера» и React перерисует экран
    expect(await screen.findByRole('heading', { name: 'Картофель' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Мёд натуральный' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.queryByText(/загрузка/i)).not.toBeInTheDocument();
  });

  test('запрашивает правильный адрес, один раз', async () => {
    const requests = recordRequests();
    renderWithProviders(<App />);
    await screen.findByRole('heading', { name: 'Картофель' });

    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /api/products']);
  });

  test('сервер упал (500) — сообщение об ошибке с role="alert", а не белый экран', async () => {
    server.use(http.get('*/api/products', () =>
      HttpResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })));
    renderWithProviders(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить товары');
    expect(screen.queryByText(/загрузка/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  test('сеть недоступна — тоже сообщение, а не пустая страница', async () => {
    server.use(http.get('*/api/products', () => HttpResponse.error())); // fetch бросит TypeError
    renderWithProviders(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить товары');
  });

  test('сервер вернул [] — «Товаров пока нет»', async () => {
    server.use(http.get('*/api/products', () => HttpResponse.json([])));
    renderWithProviders(<App />);

    expect(await screen.findByText('Товаров пока нет')).toBeInTheDocument();
  });

  test('поиск оставляет подходящие товары, а если их нет — так и пишет', async () => {
    const ui = userEvent.setup();
    renderWithProviders(<App />);
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
    localStorage.setItem('user', JSON.stringify(farmer));
    const requests = recordRequests();
    renderWithProviders(<App />);

    // Пока сервер не ответил, App верит localStorage
    expect(screen.getByText(/вы вошли как/i)).toBeInTheDocument();

    expect(await screen.findByText(/войдите заново/i)).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.queryByText(/вы вошли как/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();

    const me = requests.find((r) => r.path === '/api/auth/me');
    expect(me.headers.get('Authorization')).toBe('Bearer expired-token');
  });

  test('успешный вход сохраняет токен, «Выйти» возвращает форму', async () => {
    const ui = userEvent.setup();
    renderWithProviders(<App />);

    // «Email» на странице два (вход и заявка) — ищем внутри формы «Вход»
    const loginForm = screen.getByRole('form', { name: 'Вход' });
    await ui.type(within(loginForm).getByLabelText('Email'), farmer.email);
    await ui.type(within(loginForm).getByLabelText('Пароль'), PASSWORD);
    await ui.click(within(loginForm).getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText(/вы вошли как/i)).toHaveTextContent('Вы вошли как Фермер (user)');
    expect(localStorage.getItem('token')).toBe(TOKEN);
    // покупателю админ-панель не показывается
    expect(screen.queryByRole('heading', { name: 'Новый товар' })).not.toBeInTheDocument();

    await ui.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(screen.getByRole('form', { name: 'Вход' })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
  });
});

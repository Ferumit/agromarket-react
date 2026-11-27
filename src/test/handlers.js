import { http, HttpResponse } from 'msw';

// Подменённый API для компонентных тестов (MSW, ЛР12). Форматы ответов — как у настоящего
// agromarket-server: товары — массив, вход — { user, token }, ошибки — { error },
// ошибки валидации — { error, details: [{ field, message }] } (ЛР11).
// '*' в начале пути — подходит любой адрес API (localhost:3000, Render)

// stock и farmer_id — с ЛР13 (миграция 013_orders.sql)
export const products = [
  { id: 1, name: 'Картофель', category: 'Овощи', price: 350, unit: 'кг', image: null, stock: 20, farmer_id: null },
  { id: 2, name: 'Мёд натуральный', category: 'Мёд', price: 4500, unit: 'кг', image: null, stock: 5, farmer_id: null },
  { id: 3, name: 'Молоко фермерское', category: 'Молочная продукция', price: 600, unit: 'л', image: null, stock: 0, farmer_id: null },
];

export const farmer = { id: 7, name: 'Фермер', email: 'farmer@agromarket.kz', role: 'user' };
export const PASSWORD = 'secret123';
export const TOKEN = 'test-token';

// Ответ middleware validate: validationError(['price', 'Цена должна быть больше 0'], ...)
export function validationError(...details) {
  return HttpResponse.json(
    { error: 'Ошибка валидации', details: details.map(([field, message]) => ({ field, message })) },
    { status: 400 },
  );
}

const bearer = (request) => request.headers.get('Authorization') === `Bearer ${TOKEN}`;

export const handlers = [
  http.get('*/api/products', () => HttpResponse.json(products)),

  http.post('*/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    if (password === PASSWORD) {
      return HttpResponse.json({ user: { ...farmer, email }, token: TOKEN });
    }
    return HttpResponse.json({ error: 'Неверный email или пароль' }, { status: 401 });
  }),

  http.post('*/api/auth/register', async ({ request }) => {
    const { name, email } = await request.json();
    return HttpResponse.json({ user: { ...farmer, name, email }, token: TOKEN }, { status: 201 });
  }),

  // Сервер узнаёт пользователя только по своему токену; любой другой — 401
  http.get('*/api/auth/me', ({ request }) =>
    bearer(request)
      ? HttpResponse.json(farmer)
      : HttpResponse.json({ error: 'Недействительный токен' }, { status: 401 })),

  http.post('*/api/products', async ({ request }) =>
    HttpResponse.json({ id: 100, image: null, ...(await request.json()) }, { status: 201 })),

  http.get('*/api/orders', () => HttpResponse.json([])),
  http.get('*/api/orders/my', () => HttpResponse.json([])),
  http.get('*/api/orders/incoming', () => HttpResponse.json([])),
  http.post('*/api/orders', () => HttpResponse.json({ id: 42, status: 'new' }, { status: 201 })),
];

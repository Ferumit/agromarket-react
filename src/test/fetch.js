import { vi } from 'vitest';

// Ответ «сервера»: Response — стандартный класс, как в настоящем fetch
export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Подменяет fetch: на любой запрос — этот ответ. Возвращает шпиона, чтобы проверить запросы.
// mockImplementation, а не mockResolvedValue: тело Response читается один раз,
// поэтому на каждый запрос нужен новый объект
export function mockFetch(body, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jsonResponse(body, status));
}

// Подменяет fetch с ответом по адресу: { '/auth/me': [401, {...}], '/products': [200, [...]] }
export function mockApi(routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const path = new URL(String(url)).pathname;
    const route = Object.keys(routes).find((r) => path.endsWith(r));
    if (!route) throw new TypeError(`Нет ответа для ${url}`);
    const [status, body] = routes[route];
    return jsonResponse(body, status);
  });
}

// Тело и заголовки запроса номер n (с нуля)
export function requestOf(spy, n = 0) {
  const [url, options = {}] = spy.mock.calls[n];
  return {
    url: String(url),
    method: options.method || 'GET',
    headers: new Headers(options.headers),
    body: options.body ? JSON.parse(options.body) : undefined,
  };
}

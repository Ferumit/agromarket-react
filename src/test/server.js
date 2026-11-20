import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

// MSW перехватывает fetch на уровне сети: код компонентов и apiFetch не меняется и не знает,
// что сервер ненастоящий. Обработчики по умолчанию — handlers.js; в тесте их можно
// заменить через server.use(...) — до конца этого теста (resetHandlers в setup.js)
export const server = setupServer(...handlers);

// Журнал запросов, которые дошли до «сети»: метод, путь, заголовки, тело.
// Нужен, чтобы проверить, что форма ничего не отправила или что именно она отправила
export function recordRequests() {
  const log = [];
  server.events.on('request:start', async ({ request }) => {
    const entry = { method: request.method, path: new URL(request.url).pathname, headers: request.headers };
    log.push(entry);
    const text = await request.clone().text();
    entry.body = text ? JSON.parse(text) : undefined;
  });
  return log;
}

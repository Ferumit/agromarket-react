import '@testing-library/jest-dom/vitest'; // матчеры toBeInTheDocument, toBeDisabled...
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './server.js';

// 'error': запрос, для которого нет обработчика, валит тест —
// так не пропустим обращение к адресу, которого нет в API
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();           // убрать подмены server.use(...) из этого теста
  server.events.removeAllListeners(); // и журналы recordRequests()
  cleanup();                        // убрать отрисованное
  vi.restoreAllMocks();             // вернуть window.alert и другие шпионы
  localStorage.clear();             // токен из одного теста не должен попасть в другой
});

afterAll(() => server.close());

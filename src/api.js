// Адрес API — из переменной окружения Vite.
// Локально берётся из .env.development, на хостинге (ЛР9) — из настроек сборки
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Событие window: сервер ответил 401 на запрос с токеном
export const SESSION_EXPIRED = 'agromarket:session-expired';

// Ошибка ответа API. details — ошибки валидации по полям (ЛР11):
// 400 { error: 'Ошибка валидации', details: [{ field: 'price', message: 'Цена должна быть больше 0' }] }
export class ApiError extends Error {
  constructor(data, status) {
    const details = Array.isArray(data?.details) ? data.details : [];
    // Если в details есть тексты, сообщение собираем из них: «Ошибка валидации» сама по себе
    // ничего не говорит (так её покажет, например, alert формы заявки).
    // У 409 «Недостаточно товара» (ЛР13) в details не тексты, а { name, available }
    const messages = details.map((d) => d.message).filter(Boolean);
    super(messages.length ? messages.join('. ') : data?.error || `Ошибка ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.error = data?.error; // общий текст ответа сервера: «Ошибка валидации», «Недостаточно товара»
  }
}

// Обёртка над fetch: добавляет токен, разбирает JSON и превращает ошибки API в исключения
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = res.status === 204 ? null : await res.json();

  // Токен был, но сервер его не принял (истёк / подделан) — выходим из аккаунта.
  // Без перезагрузки страницы: App ловит событие и показывает форму входа,
  // а введённое в формах не теряется
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event(SESSION_EXPIRED));
  }

  if (!res.ok) {
    throw new ApiError(data, res.status);
  }
  return data;
}

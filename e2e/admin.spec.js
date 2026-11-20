import { test, expect } from '@playwright/test';

// Сценарий администратора (в лабораторной — «фермера»: у нас товары добавляет роль admin).
// Регистрация всегда даёт роль user (mass assignment, ЛР11), поэтому нужен готовый аккаунт
// из сида — его данные берутся из .env.e2e (в .gitignore), а не из кода
const { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } = process.env;

test.skip(!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD, 'нет E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (.env.e2e)');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const form = page.getByRole('form', { name: 'Вход' });
  await form.getByLabel('Email').fill(E2E_ADMIN_EMAIL);
  await form.getByLabel('Пароль').fill(E2E_ADMIN_PASSWORD);
  await form.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible();
});

test('администратор добавляет товар, он появляется в каталоге, затем удаляется', async ({ page }) => {
  const name = `Тестовый мёд ${Date.now()}`;
  const form = page.getByRole('form', { name: 'Новый товар' });
  await form.getByLabel('Название').fill(name);
  await form.getByLabel('Категория').fill('Мёд');
  await form.getByLabel('Цена').fill('3500');
  await form.getByRole('button', { name: 'Добавить' }).click();

  const card = page.getByTestId('product-card').filter({ hasText: name });
  await expect(card).toContainText('3500 тг / кг');

  // После перезагрузки товар на месте — он в базе, а не только в состоянии React
  await page.reload();
  await expect(card).toBeVisible();

  // Тест убирает за собой: удаление через интерфейс (confirm → OK)
  page.once('dialog', (dialog) => dialog.accept());
  await card.getByRole('button', { name: 'Удалить' }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('product-card').first()).toBeVisible();
  await expect(card).toHaveCount(0);
});

test('цена -500 не принимается: форму останавливает браузер', async ({ page }) => {
  const sent = [];
  page.on('request', (r) => r.method() === 'POST' && r.url().endsWith('/products') && sent.push(r.url()));
  const form = page.getByRole('form', { name: 'Новый товар' });
  await form.getByLabel('Название').fill('Мёд');
  await form.getByLabel('Категория').fill('Мёд');
  await form.getByLabel('Цена').fill('-500');
  await form.getByRole('button', { name: 'Добавить' }).click();

  const price = form.getByLabel('Цена');
  expect(await price.evaluate((el) => el.validity.rangeUnderflow)).toBe(true);
  expect(sent).toEqual([]); // до сервера запрос не дошёл
});

test('цена -500 в обход формы: сервер (zod) отвечает 400 с details', async ({ page }) => {
  // Тот же запрос, что из Console браузера: токен администратора есть, а формы нет
  const api = process.env.E2E_API_URL || 'http://localhost:3000/api';
  const result = await page.evaluate(async (api) => {
    const res = await fetch(`${api}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ name: 'Мёд', category: 'Мёд', price: -500 }),
    });
    return { status: res.status, body: await res.json() };
  }, api);
  expect(result.status).toBe(400);
  expect(result.body.details).toContainEqual({ field: 'price', message: 'Цена должна быть больше 0' });
});

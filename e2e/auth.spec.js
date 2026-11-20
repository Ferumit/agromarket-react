import { test, expect } from '@playwright/test';

// Эти тесты создают пользователей — только локально (база для разработки), не на продакшене
test('новый покупатель регистрируется и видит своё имя', async ({ page }) => {
  const email = `e2e${Date.now()}@test.kz`; // уникальный: тест можно повторять без 409
  await page.goto('/');
  await page.getByRole('button', { name: /нет аккаунта/i }).click();

  const form = page.getByRole('form', { name: 'Регистрация' });
  await form.getByLabel('Имя').fill('E2E Тестов');
  await form.getByLabel('Email').fill(email);
  await form.getByLabel('Пароль').fill('12345678');
  await form.getByRole('button', { name: /зарегистр/i }).click();

  await expect(page.getByText(/вы вошли как/i)).toContainText('E2E Тестов');
  await page.reload(); // токен в localStorage, сервер подтверждает его через /auth/me
  await expect(page.getByText(/вы вошли как/i)).toContainText('E2E Тестов');
});

test('неверный пароль — ошибка, форма входа остаётся', async ({ page }) => {
  await page.goto('/login');
  const form = page.getByRole('form', { name: 'Вход' });
  await form.getByLabel('Email').fill('nobody@test.kz');
  await form.getByLabel('Пароль').fill('wrong-password');
  await form.getByRole('button', { name: 'Войти' }).click();

  await expect(form.getByRole('alert')).toHaveText(/неверный/i);
  await expect(form).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('короткий пароль: браузер не отправляет регистрацию', async ({ page }) => {
  // Компонентный тест этого не проверит: в jsdom minlength не работает
  const requests = [];
  page.on('request', (r) => r.url().includes('/auth/') && requests.push(r.url()));
  await page.goto('/');
  await page.getByRole('button', { name: /нет аккаунта/i }).click();

  const form = page.getByRole('form', { name: 'Регистрация' });
  await form.getByLabel('Имя').fill('E2E Тестов');
  await form.getByLabel('Email').fill(`e2e-short${Date.now()}@test.kz`);
  await form.getByLabel('Пароль').fill('1234567');
  await form.getByRole('button', { name: /зарегистр/i }).click();

  expect(await form.getByLabel('Пароль').evaluate((el) => el.validity.tooShort)).toBe(true);
  expect(requests).toEqual([]);
});

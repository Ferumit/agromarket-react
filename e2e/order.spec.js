import { test, expect } from '@playwright/test';

// Сценарий покупателя целиком (ЛР13): регистрация → корзина → оформление → «Мои заказы».
// Создаёт пользователя и заказ и списывает остаток, поэтому — только локально (npm run e2e)
test('покупатель кладёт товар в корзину и оформляет заказ', async ({ page }) => {
  const email = `buyer${Date.now()}@test.kz`;
  await page.goto('/');

  await page.getByRole('button', { name: /нет аккаунта/i }).click();
  const register = page.getByRole('form', { name: 'Регистрация' });
  await register.getByLabel('Имя').fill('E2E Покупатель');
  await register.getByLabel('Email').fill(email);
  await register.getByLabel('Пароль').fill('E2e-Test-Password-123');
  await register.getByRole('button', { name: /зарегистр/i }).click();
  await expect(page.getByText(/вы вошли как/i)).toContainText('E2E Покупатель');

  // первая карточка, товар которой есть в наличии
  const card = page.getByTestId('product-card')
    .filter({ has: page.getByRole('button', { name: 'В корзину', disabled: false }) })
    .first();
  const name = (await card.getByRole('heading').innerText()).trim();
  await card.getByRole('button', { name: 'В корзину' }).click();
  await page.getByRole('link', { name: /корзина \(1\)/i }).click();

  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  await page.getByLabel(/адрес доставки/i).fill('Астана, ул. Женис, 62');
  await page.getByRole('button', { name: /оформить заказ/i }).click();

  await expect(page).toHaveURL(/\/orders\?created=\d+/);
  await expect(page.getByText(/заказ №\d+ оформлен/i)).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible(); // заказ есть в «Моих заказах»
  await expect(page.getByRole('link', { name: /корзина \(0\)/i })).toBeVisible(); // корзина очищена
});

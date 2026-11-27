// src/context/CartContext.test.jsx — корзина (ЛР13)
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from '../components/ProductCard';
import { renderWithProviders } from '../test/utils.jsx';

const honey = { id: 1, name: 'Мёд гречишный', price: 3500, category: 'Мёд', unit: 'кг', stock: 2 };

describe('Корзина', () => {
  test('«В корзину» дважды — одна позиция, количество 2, сохранено в localStorage', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard product={honey} />);

    await user.click(screen.getByRole('button', { name: 'В корзину' }));
    await user.click(screen.getByRole('button', { name: 'В корзину' }));

    expect(screen.getByText(/в корзине: 2/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('cart'))).toEqual([
      { productId: 1, name: 'Мёд гречишный', price: 3500, quantity: 2 },
    ]);
  });

  test('нельзя положить больше, чем есть на складе', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard product={honey} />);

    await user.click(screen.getByRole('button', { name: 'В корзину' }));
    await user.click(screen.getByRole('button', { name: 'В корзину' }));

    expect(screen.getByRole('button', { name: 'В корзину' })).toBeDisabled();
  });

  test('товара нет в наличии — кнопка неактивна', () => {
    renderWithProviders(<ProductCard product={{ ...honey, stock: 0 }} />);
    expect(screen.getByRole('button', { name: /нет в наличии/i })).toBeDisabled();
  });

  test('корзина переживает перезагрузку страницы', () => {
    localStorage.setItem('cart', JSON.stringify([{ productId: 1, name: 'Мёд гречишный', price: 3500, quantity: 1 }]));
    renderWithProviders(<ProductCard product={honey} />);
    expect(screen.getByText(/в корзине: 1/i)).toBeInTheDocument();
  });
});

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from './ProductCard';
import { renderWithProviders } from '../test/utils.jsx';

const product = {
  id: 2,
  name: 'Мёд натуральный',
  category: 'Мёд',
  price: 4500,
  unit: 'кг',
  image: 'https://placehold.co/300x200?text=Honey',
};

// Кнопка «В корзину» и остаток (ЛР13) — в src/context/CartContext.test.jsx
describe('ProductCard', () => {
  test('показывает название, цену с единицей и фото', () => {
    renderWithProviders(<ProductCard product={product} />);

    expect(screen.getByRole('heading', { name: 'Мёд натуральный' })).toBeInTheDocument();
    expect(screen.getByText('4500 тг / кг')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Мёд натуральный' })).toHaveAttribute('src', product.image);
  });

  test('без фото показывает заглушку с названием товара в alt', () => {
    renderWithProviders(<ProductCard product={{ ...product, image: null }} />);

    const img = screen.getByRole('img', { name: 'Мёд натуральный' });
    expect(img.getAttribute('src')).toMatch(/placehold\.co.*No\+photo/);
  });

  test('кнопка «В корзину» кладёт товар в корзину (ЛР13: корзина — контекст, а не onAdd)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard product={product} />);

    await user.click(screen.getByRole('button', { name: /в корзину/i }));

    expect(screen.getByText(/в корзине: 1/i)).toBeInTheDocument();
  });

  test('плашка «Товар недели» — только у featured', () => {
    const { rerender } = renderWithProviders(<ProductCard product={product} featured />);
    expect(screen.getByText('Товар недели')).toBeInTheDocument();

    rerender(<ProductCard product={product} />);
    expect(screen.queryByText('Товар недели')).not.toBeInTheDocument();
  });

  test('без onDelete кнопки «Удалить» нет (гость и покупатель)', () => {
    renderWithProviders(<ProductCard product={product} />);

    expect(screen.queryByRole('button', { name: /удалить/i })).not.toBeInTheDocument();
  });

  test('«Удалить» у администратора вызывает onDelete с товаром', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithProviders(<ProductCard product={product} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /удалить/i }));

    expect(onDelete).toHaveBeenCalledWith(product);
    expect(screen.queryByText(/в корзине/i)).not.toBeInTheDocument(); // в корзину не положили
  });

  test('владелец сохраняет остаток — onStockSave с числом', async () => {
    const user = userEvent.setup();
    const onStockSave = vi.fn();
    renderWithProviders(<ProductCard product={{ ...product, stock: 0 }} onStockSave={onStockSave} />);

    const input = screen.getByRole('spinbutton', { name: 'Остаток: Мёд натуральный' });
    await user.clear(input);
    await user.type(input, '15');
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onStockSave).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }), 15);
  });
});

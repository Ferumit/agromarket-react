import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductCard from './ProductCard';

const product = {
  id: 2,
  name: 'Мёд натуральный',
  category: 'Мёд',
  price: 4500,
  unit: 'кг',
  image: 'https://placehold.co/300x200?text=Honey',
};

// Поля stock в базе нет (таблица products из ЛР6), поэтому теста «нет в наличии» тоже нет
describe('ProductCard', () => {
  test('показывает название, цену с единицей и фото', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Мёд натуральный' })).toBeInTheDocument();
    expect(screen.getByText('4500 тг / кг')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Мёд натуральный' })).toHaveAttribute('src', product.image);
  });

  test('без фото показывает заглушку с названием товара в alt', () => {
    render(<ProductCard product={{ ...product, image: null }} onAdd={vi.fn()} />);

    const img = screen.getByRole('img', { name: 'Мёд натуральный' });
    expect(img.getAttribute('src')).toMatch(/placehold\.co.*No\+photo/);
  });

  test('кнопка «В корзину» вызывает onAdd с товаром', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(); // «шпион»: запоминает, как его вызвали
    render(<ProductCard product={product} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /в корзину/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(product);
  });

  test('плашка «Товар недели» — только у featured', () => {
    const { rerender } = render(<ProductCard product={product} onAdd={vi.fn()} featured />);
    expect(screen.getByText('Товар недели')).toBeInTheDocument();

    rerender(<ProductCard product={product} onAdd={vi.fn()} />);
    expect(screen.queryByText('Товар недели')).not.toBeInTheDocument();
  });

  test('без onDelete кнопки «Удалить» нет (гость и покупатель)', () => {
    render(<ProductCard product={product} onAdd={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /удалить/i })).not.toBeInTheDocument();
  });

  test('«Удалить» у администратора вызывает onDelete с товаром', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onDelete = vi.fn();
    render(<ProductCard product={product} onAdd={onAdd} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /удалить/i }));

    expect(onDelete).toHaveBeenCalledWith(product);
    expect(onAdd).not.toHaveBeenCalled();
  });
});

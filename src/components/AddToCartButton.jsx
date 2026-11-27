// src/components/AddToCartButton.jsx — кнопка в карточке товара (ЛР13)
import { useCart } from '../context/CartContext.jsx';

export default function AddToCartButton({ product }) {
  const { items, add } = useCart();
  const inCart = items.find((i) => i.productId === product.id)?.quantity ?? 0;

  if (product.stock === 0) {
    return <button type="button" disabled>Нет в наличии</button>;
  }

  // больше, чем есть на складе, положить нельзя (сервер всё равно проверит — 409)
  const limitReached = product.stock !== undefined && inCart >= product.stock;
  return (
    <>
      <button type="button" onClick={() => add(product)} disabled={limitReached}>
        В корзину
      </button>
      {inCart > 0 && <span className="in-cart"> В корзине: {inCart}</span>}
    </>
  );
}

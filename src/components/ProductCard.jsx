import { useId } from 'react';
import AddToCartButton from './AddToCartButton.jsx';

// onDelete и onStockSave App передаёт только тому, кто может менять товар:
// администратору или фермеру — владельцу товара (ЛР13)
function ProductCard({ product, featured, onDelete, onStockSave }) {
  return (
    <article className={featured ? 'card card--featured' : 'card'} data-testid="product-card">
      {featured && <span className="badge">Товар недели</span>}
      {/* у товара, добавленного через форму, картинки может не быть */}
      <img src={product.image || 'https://placehold.co/300x200?text=No+photo'} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price} тг / {product.unit}</p>
      {product.stock > 0 && <p className="stock">В наличии: {product.stock}</p>}
      <AddToCartButton product={product} />
      {onStockSave && <StockForm product={product} onSave={onStockSave} />}
      {onDelete && (
        <button className="card-delete" onClick={() => onDelete(product)}>Удалить</button>
      )}
    </article>
  );
}

// Остаток на складе: после миграции 013 у всех товаров 0, его задают владелец или администратор
function StockForm({ product, onSave }) {
  const id = useId();
  function handleSubmit(e) {
    e.preventDefault();
    onSave(product, Number(new FormData(e.target).get('stock')));
  }
  return (
    <form className="stock-form" onSubmit={handleSubmit}>
      <label htmlFor={id}>Остаток</label>
      <input id={id} name="stock" type="number" min="0" required defaultValue={product.stock ?? 0}
        aria-label={`Остаток: ${product.name}`} />
      <button type="submit">Сохранить</button>
    </form>
  );
}

export default ProductCard;

function ProductCard({ product, onAdd, featured, onDelete }) {
  return (
    <article className={featured ? 'card card--featured' : 'card'}>
      {featured && <span className="badge">Товар недели</span>}
      {/* у товара, добавленного через форму, картинки может не быть */}
      <img src={product.image || 'https://placehold.co/300x200?text=No+photo'} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price} тг / {product.unit}</p>
      <button onClick={() => {}}>В корзину</button>
      {/* Бонус ЛР7: кнопка видна только администратору — App передаёт onDelete только ему */}
      {onDelete && (
        <button className="card-delete" onClick={() => onDelete(product)}>Удалить</button>
      )}
    </article>
  );
}

export default ProductCard;

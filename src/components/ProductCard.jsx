function ProductCard({ product, onAdd, featured }) {
  return (
    <article className={featured ? 'card card--featured' : 'card'}>
      {featured && <span className="badge">Товар недели</span>}
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price} тг / {product.unit}</p>
      <button onClick={() => onAdd(product)}>В корзину</button>
    </article>
  );
}

export default ProductCard;

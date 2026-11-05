function FoodCard({ name, price, isVeg, category, rating, numReviews, isSpecial, onAdd }) {
  return (
    <div className={`food-card ${isSpecial ? "is-special-card" : ""}`}>
      <div className="card-top-badges">
        <span className={isVeg ? "badge veg" : "badge nonveg"}>
          {isVeg ? "Veg" : "Non-Veg"}
        </span>
        {isSpecial && <span className="badge special-badge">🔥 Today's Special</span>}
      </div>

      <h3>{name}</h3>
      <p className="category">{category}</p>

      <div className="card-meta-row">
        <span className="price">₹{price}</span>
        <span className="food-rating" title={`${numReviews || 0} reviews`}>
          ⭐ <strong>{rating ? Number(rating).toFixed(1) : "4.5"}</strong>
          <span className="review-count"> ({numReviews || 0})</span>
        </span>
      </div>

      <button onClick={onAdd}>Add to Cart</button>
    </div>
  );
}

export default FoodCard;

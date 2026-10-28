function FoodCard({ name, price, isVeg, category }) {
  return (
    <div className="food-card">
      <span className={isVeg ? "badge veg" : "badge nonveg"}>
        {isVeg ? "Veg" : "Non-Veg"}
      </span>
      <h3>{name}</h3>
      <p className="category">{category}</p>
      <p className="price">₹{price}</p>
      <button>Add to Cart</button>
    </div>
  );
}

export default FoodCard;
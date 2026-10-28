import { useState } from "react";
import FoodCard from "./components/FoodCard";

const foodItems = [
  { id: 1, name: "Veg Burger", price: 60, isVeg: true, category: "Snacks" },
  { id: 2, name: "Masala Dosa", price: 50, isVeg: true, category: "Breakfast" },
  { id: 3, name: "Chicken Biryani", price: 120, isVeg: false, category: "Meals" },
  { id: 4, name: "Cold Coffee", price: 40, isVeg: true, category: "Drinks" },
];

function App() {
  const [cart, setCart] = useState([]);

  function addToCart(item) {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <div className="page">
      <h1>Campus 360</h1>
      <h2>Smart Canteen</h2>
      <p>Order your food online and skip the queue.</p>

      <div className="food-grid">
        {foodItems.map((item) => (
          <FoodCard
            key={item.id}
            name={item.name}
            price={item.price}
            isVeg={item.isVeg}
            category={item.category}
            onAdd={() => addToCart(item)}
          />
        ))}
      </div>

      <div className="cart">
        <h3>Your Cart</h3>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            {cart.map((c) => (
              <div className="cart-row" key={c.id}>
                <span>
                  {c.name} × {c.quantity}
                </span>
                <span>₹{c.price * c.quantity}</span>
              </div>
            ))}
            <div className="cart-row total">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
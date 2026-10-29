import { useState, useEffect } from "react";
import axios from "axios";
import FoodCard from "./components/FoodCard";

function App() {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    axios
      .get("/api/menu")
      .then((res) => {
        setFoodItems(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load the menu. Is the server running?");
        setLoading(false);
      });
  }, []);

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

      {loading && <p>Loading menu...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

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
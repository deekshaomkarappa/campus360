import { useState, useEffect } from "react";
import axios from "axios";
import FoodCard from "./components/FoodCard";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import MyOrders from "./components/MyOrders";

function App() {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [orderType, setOrderType] = useState("pickup");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderIsError, setOrderIsError] = useState(false);
  const [ordersKey, setOrdersKey] = useState(0);

  function loadMenu() {
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
  }

  useEffect(() => {
    loadMenu();
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

  function logout() {
    axios.post("/api/auth/logout").finally(() => {
      setUser(null);
      setCart([]);
      setOrderMessage("");
    });
  }

  function placeOrder() {
    setOrderMessage("");
    axios
      .post("/api/orders", {
        orderType,
        items: cart.map((c) => ({ id: c.id, quantity: c.quantity })),
      })
      .then((res) => {
        setOrderIsError(false);
        setOrderMessage(
          `Order placed! Your order number is ${res.data.order.orderNumber}`
        );
        setCart([]);
        setOrdersKey((k) => k + 1);
      })
      .catch((err) => {
        setOrderIsError(true);
        setOrderMessage(
          err.response?.data?.message || "Could not place the order"
        );
      });
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <div className="page">
      <h1>Campus 360</h1>
      <h2>Smart Canteen</h2>
      <p>Order your food online and skip the queue.</p>

      {user && (
        <div className="welcome-bar">
          <span>
            Welcome, <strong>{user.name}</strong> ({user.role})
          </span>
          <button onClick={logout}>Logout</button>
        </div>
      )}

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

            {user ? (
              <div className="order-box">
                <label>
                  <input
                    type="radio"
                    checked={orderType === "pickup"}
                    onChange={() => setOrderType("pickup")}
                  />{" "}
                  Pickup
                </label>
                <label>
                  <input
                    type="radio"
                    checked={orderType === "dine-in"}
                    onChange={() => setOrderType("dine-in")}
                  />{" "}
                  Dine-in
                </label>
                <p className="note">
                  Payment: cash at the counter (demo, no real payment).
                </p>
                <button className="order-btn" onClick={placeOrder}>
                  Place Order
                </button>
              </div>
            ) : (
              <p className="note">Please log in below to place your order.</p>
            )}
          </>
        )}

        {orderMessage && (
          <p style={{ color: orderIsError ? "#dc2626" : "#16a34a", fontWeight: "bold" }}>
            {orderMessage}
          </p>
        )}
      </div>

      {user && <MyOrders refreshKey={ordersKey} />}

      {!user && <LoginForm onLogin={setUser} />}
      {!user && <RegisterForm />}
    </div>
  );
}

export default App;
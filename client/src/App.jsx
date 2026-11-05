import { useState, useEffect } from "react";
import axios from "axios";
import FoodCard from "./components/FoodCard";
import RegisterForm from "./components/RegisterForm";
import LoginForm from "./components/LoginForm";
import MyOrders from "./components/MyOrders";
import AdminDashboard from "./components/AdminDashboard";
import CrowdMeter from "./components/CrowdMeter";
import Notifications from "./components/Notifications";

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);
  const [adminView, setAdminView] = useState("menu"); // "menu" or "panel"

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
    axios
      .get("/api/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {});
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
          "Order placed! Your order number is " + res.data.order.orderNumber
        );
        setCart([]);
        setOrdersKey((k) => k + 1);
        loadMenu();
      })
      .catch((err) => {
        setOrderIsError(true);
        setOrderMessage(
          err.response?.data?.message || "Could not place the order"
        );
      });
  }

  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const isAdmin = user && user.role === "admin";

  // Quick search tags for popular dishes
  const quickSearchTags = [
    "Idli",
    "Rice Rasam",
    "Maggi",
    "Noodles",
    "Chapati and Chutney",
    "Biryani",
    "Palav",
    "Tomato Bath",
    "Parota",
  ];

  // Dynamic categories extracted from current food items
  const categories = ["All", ...Array.from(new Set(foodItems.map((f) => f.category)))];

  // Real-time filtered food items based on search query, category, and veg toggle
  const filteredFoodItems = foodItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesVeg = !vegOnly || item.isVeg;
    return matchesSearch && matchesCategory && matchesVeg;
  });

  // Today's Specials
  const specials = foodItems.filter((f) => f.isSpecial);

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
          <div className="welcome-actions">
            {!isAdmin && <Notifications refreshKey={ordersKey} />}
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="admin-nav-bar">
          <button
            type="button"
            className={`admin-nav-btn ${adminView === "menu" ? "active" : ""}`}
            onClick={() => setAdminView("menu")}
          >
            🍔 Food Menu & Search
          </button>
          <button
            type="button"
            className={`admin-nav-btn ${adminView === "panel" ? "active" : ""}`}
            onClick={() => setAdminView("panel")}
          >
            ⚙️ Canteen Admin Panel
          </button>
        </div>
      )}

      {isAdmin && adminView === "panel" ? (
        <AdminDashboard />
      ) : (
        <>
          <CrowdMeter />

          {/* Search & Category Filter Bar */}
          <div className="search-filter-box">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search your food..."
                aria-label="Search your food"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Search Tag Pills */}
            <div className="quick-search-row">
              <span className="quick-label">⚡ Quick search:</span>
              <div className="quick-tags">
                {quickSearchTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`quick-tag ${
                      searchQuery.toLowerCase() === tag.toLowerCase() ? "active" : ""
                    }`}
                    onClick={() => {
                      if (searchQuery.toLowerCase() === tag.toLowerCase()) {
                        setSearchQuery("");
                      } else {
                        setSearchQuery(tag);
                        setSelectedCategory("All");
                      }
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-options">
              <div className="category-pills">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pill ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <label className="veg-filter-label">
                <input
                  type="checkbox"
                  checked={vegOnly}
                  onChange={(e) => setVegOnly(e.target.checked)}
                />
                🥬 Veg Only
              </label>
            </div>
          </div>

          {loading && <p>Loading menu...</p>}
          {error && <p style={{ color: "#dc2626" }}>{error}</p>}

          {filteredFoodItems.length === 0 && !loading && (
            <div className="no-food-box">
              <p>
                No food item matches "<strong>{searchQuery || selectedCategory}</strong>"
              </p>
              {(searchQuery || selectedCategory !== "All" || vegOnly) && (
                <button
                  type="button"
                  className="reset-search-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setVegOnly(false);
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {specials.length > 0 && !searchQuery && selectedCategory === "All" && (
            <div className="specials-container">
              <h3 className="specials-title">🔥 Today's Chef's Specials</h3>
              <div className="specials-grid">
                {specials.map((item) => (
                  <FoodCard
                    key={`special-${item.id}`}
                    name={item.name}
                    price={item.price}
                    isVeg={item.isVeg}
                    category={item.category}
                    rating={item.rating}
                    numReviews={item.numReviews}
                    isSpecial={true}
                    onAdd={() => addToCart(item)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="food-grid">
            {filteredFoodItems.map((item) => (
              <FoodCard
                key={item.id}
                name={item.name}
                price={item.price}
                isVeg={item.isVeg}
                category={item.category}
                rating={item.rating}
                numReviews={item.numReviews}
                isSpecial={item.isSpecial}
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
              <p
                style={{
                  color: orderIsError ? "#dc2626" : "#16a34a",
                  fontWeight: "bold",
                }}
              >
                {orderMessage}
              </p>
            )}
          </div>

          {user && (
            <MyOrders
              refreshKey={ordersKey}
              onOrderCancelled={() => {
                loadMenu();
                setOrdersKey((k) => k + 1);
              }}
            />
          )}
        </>
      )}

      {!user && <LoginForm onLogin={setUser} />}
      {!user && <RegisterForm />}
    </div>
  );
}

export default App;

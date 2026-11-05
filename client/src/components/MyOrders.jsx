import { useState, useEffect } from "react";
import axios from "axios";

const STATUS_LABELS = {
  placed: "Order Placed",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

function MyOrders({ refreshKey, onOrderCancelled }) {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratings, setRatings] = useState({});

  function loadOrders() {
    axios
      .get("/api/orders/my")
      .then((res) => setOrders(res.data))
      .catch(() => setMessage("Could not load your orders"));
  }

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 10000);
    return () => clearInterval(timer);
  }, [refreshKey]);

  function cancelOrder(id) {
    if (!window.confirm("Cancel this order?")) return;
    axios
      .post(`/api/orders/${id}/cancel`)
      .then(() => {
        loadOrders();
        if (onOrderCancelled) onOrderCancelled();
      })
      .catch((err) =>
        setMessage(err.response?.data?.message || "Could not cancel")
      );
  }

  function startRating(order) {
    setRatingOrder(order);
    const initial = {};
    order.items.forEach((item) => {
      initial[item.foodItem] = 5;
    });
    setRatings(initial);
  }

  function submitRating(e) {
    e.preventDefault();
    if (!ratingOrder) return;
    const payload = Object.entries(ratings).map(([foodItemId, rating]) => ({
      foodItemId,
      rating: Number(rating),
    }));

    axios
      .post(`/api/orders/${ratingOrder.id}/rate`, { ratings: payload })
      .then((res) => {
        setMessage(res.data.message);
        setTimeout(() => setMessage(""), 4000);
        setRatingOrder(null);
        loadOrders();
        if (onOrderCancelled) onOrderCancelled();
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || "Could not submit rating");
      });
  }

  // Once cancelled, do not display the order on the dashboard
  const activeOrders = orders.filter((o) => o.status !== "cancelled");

  return (
    <div className="cart">
      <h3>My Orders</h3>
      {message && <p className="status-note">{message}</p>}

      {/* Interactive Rating Modal / Box */}
      {ratingOrder && (
        <div className="rating-box">
          <h4>⭐ Rate Your Food ({ratingOrder.orderNumber})</h4>
          <p className="note">How was each dish you ordered?</p>
          <form onSubmit={submitRating}>
            {ratingOrder.items.map((item) => (
              <div key={item.foodItem} className="rating-item-row">
                <span>{item.name}</span>
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${
                        (ratings[item.foodItem] || 5) >= star ? "active" : ""
                      }`}
                      onClick={() =>
                        setRatings({ ...ratings, [item.foodItem]: star })
                      }
                    >
                      ★
                    </button>
                  ))}
                  <span className="star-number">
                    {ratings[item.foodItem] || 5}/5
                  </span>
                </div>
              </div>
            ))}
            <div className="rating-actions">
              <button type="submit" className="order-btn">
                Submit Review
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setRatingOrder(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {activeOrders.length === 0 ? (
        <p>You have no active orders.</p>
      ) : (
        activeOrders.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="cart-row">
              <strong>{o.orderNumber}</strong>
              <span className={`status status-${o.status}`}>
                {STATUS_LABELS[o.status]}
              </span>
            </div>
            <p className="note">
              {o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")} ·{" "}
              {o.orderType} · ₹{o.totalAmount}
            </p>
            {o.estimatedWaitMinutes !== null && (
              <p className="note">
                Orders ahead of you: {o.ordersAhead} · Estimated wait: about{" "}
                {o.estimatedWaitMinutes} min
              </p>
            )}

            <div className="order-bottom-actions">
              {o.status === "placed" && (
                <button className="cancel-btn" onClick={() => cancelOrder(o.id)}>
                  Cancel order
                </button>
              )}

              {o.status === "completed" && !o.isRated && (
                <button
                  type="button"
                  className="rate-btn"
                  onClick={() => startRating(o)}
                >
                  ⭐ Rate Food
                </button>
              )}

              {o.status === "completed" && o.isRated && (
                <span className="rated-tag">⭐ Rated</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default MyOrders;

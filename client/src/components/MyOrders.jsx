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

function MyOrders({ refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");

  function loadOrders() {
    axios
      .get("/api/orders/my")
      .then((res) => setOrders(res.data))
      .catch(() => setMessage("Could not load your orders"));
  }

  useEffect(() => {
    loadOrders();
    const timer = setInterval(loadOrders, 10000); // refresh every 10 seconds
    return () => clearInterval(timer);
  }, [refreshKey]);

  function cancelOrder(id) {
    if (!window.confirm("Cancel this order?")) return;
    axios
      .post(`/api/orders/${id}/cancel`)
      .then(() => loadOrders())
      .catch((err) =>
        setMessage(err.response?.data?.message || "Could not cancel")
      );
  }

  return (
    <div className="cart">
      <h3>My Orders</h3>
      {message && <p style={{ color: "#dc2626" }}>{message}</p>}
      {orders.length === 0 ? (
        <p>You have no orders yet.</p>
      ) : (
        orders.map((o) => (
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
                {o.estimatedWaitMinutes} min (an estimate, not a guaranteed time)
              </p>
            )}
            {o.status === "placed" && (
              <button className="cancel-btn" onClick={() => cancelOrder(o.id)}>
                Cancel order
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default MyOrders;
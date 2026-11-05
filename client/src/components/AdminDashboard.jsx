import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

const NEXT_BUTTONS = {
  placed: [["accepted", "Accept"], ["cancelled", "Reject"]],
  accepted: [["preparing", "Start preparing"], ["cancelled", "Cancel"]],
  preparing: [["ready", "Mark ready"]],
  ready: [["completed", "Complete"]],
};

const emptyForm = {
  id: null, name: "", category: "", price: "", quantityAvailable: "",
  isVeg: true, isAvailable: true, imageUrl: "",
};

function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState(null);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [walkinCart, setWalkinCart] = useState({});
  const [walkinName, setWalkinName] = useState("");
  const [walkinStaff, setWalkinStaff] = useState(false);
  const [message, setMessage] = useState("");
  const [adminSearch, setAdminSearch] = useState("");

  const filteredMenu = menu.filter(
    (m) =>
      m.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(adminSearch.toLowerCase())
  );

  function show(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  }
  function fail(err) {
    show(err.response?.data?.message || "Something went wrong");
  }

  function loadOrders() {
    axios.get("/api/admin/orders").then((r) => setOrders(r.data)).catch(fail);
  }
  function loadMenu() {
    axios.get("/api/admin/menu").then((r) => setMenu(r.data)).catch(fail);
  }
  function loadStats() {
    axios.get("/api/admin/analytics").then((r) => setStats(r.data)).catch(fail);
  }

  useEffect(() => {
    loadMenu();
    loadOrders();
    const t = setInterval(loadOrders, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (tab === "analytics") loadStats();
    if (tab === "menu" || tab === "inventory" || tab === "walkin") loadMenu();
  }, [tab]);

  function setStatus(id, status) {
    if (status === "cancelled" && !window.confirm("Cancel this order?")) return;
    axios.patch(`/api/admin/orders/${id}/status`, { status })
      .then(loadOrders).catch(fail);
  }

  function saveFood(e) {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), quantityAvailable: Number(form.quantityAvailable) };
    const req = form.id
      ? axios.put(`/api/admin/menu/${form.id}`, body)
      : axios.post("/api/admin/menu", body);
    req.then((r) => { show(r.data.message); setForm(emptyForm); loadMenu(); }).catch(fail);
  }

  function deleteFood(id) {
    if (!window.confirm("Delete this food item?")) return;
    axios.delete(`/api/admin/menu/${id}`).then(() => { show("Deleted"); loadMenu(); }).catch(fail);
  }

  function quickUpdate(item, changes) {
    axios.put(`/api/admin/menu/${item.id}`, { ...item, ...changes })
      .then(loadMenu).catch(fail);
  }

  function addWalkin() {
    const items = Object.entries(walkinCart)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => ({ id, quantity }));
    axios.post("/api/admin/orders/walkin", { items, customerName: walkinName, isStaff: walkinStaff })
      .then((r) => {
        show("Walk-in order added: " + r.data.orderNumber);
        setWalkinCart({}); setWalkinName(""); setWalkinStaff(false);
        loadOrders(); loadMenu();
      }).catch(fail);
  }

  const tabs = [["orders", "Orders"], ["walkin", "Walk-in"], ["menu", "Menu"], ["inventory", "Inventory"], ["analytics", "Analytics"]];

  return (
    <div className="admin">
      <h3>Canteen Admin</h3>

      {/* Prominent Search Bar on Admin Dashboard */}
      <div className="search-filter-box" style={{ margin: "12px 0 18px" }}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search your food..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
          />
          {adminSearch && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setAdminSearch("")}
            >
              ✕
            </button>
          )}
        </div>
        {adminSearch && (
          <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", marginTop: "8px", border: "1px solid #e2e8f0" }}>
            <p className="note" style={{ margin: "0 0 6px", fontWeight: "bold" }}>
              Matching Food Items ({filteredMenu.length}):
            </p>
            {filteredMenu.length === 0 ? (
              <p className="note" style={{ color: "#dc2626", margin: 0 }}>No food items match "{adminSearch}"</p>
            ) : (
              filteredMenu.map((m) => (
                <div key={m.id} className="cart-row" style={{ padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <span><strong>{m.name}</strong> ({m.category}) · ₹{m.price} {m.isVeg ? "🟢 Veg" : "🔴 Non-Veg"}</span>
                  <span>Stock: <strong>{m.quantityAvailable}</strong> {m.isAvailable ? "(Available)" : "(Hidden)"}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? "tab active" : "tab"} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {message && <p className="admin-msg">{message}</p>}

      {tab === "orders" && (
        <div>
          {orders && (
            <p className="note">
              Pending orders: <strong>{orders.pendingOrders}</strong>
              {" | "}Workload: <strong>{orders.workload}</strong>
              {" | "}Priority rule: a teacher goes first only when orders arrive within 60 seconds of each other.
            </p>
          )}
          {orders && orders.queue.length === 0 && <p>No orders in the queue.</p>}
          {orders && orders.queue.map((o) => (
            <div className="order-card" key={o.id}>
              <div className="cart-row">
                <strong>#{o.position} | {o.orderNumber}</strong>
                <span className={"status status-" + o.status}>{o.status}</span>
              </div>
              <p className="note">
                {o.customerName} | {o.orderType}{o.priority === 1 ? " | STAFF PRIORITY" : ""} | Rs {o.totalAmount}
                <br />
                {o.items.map((i) => i.name + " x " + i.quantity).join(", ")}
              </p>
              {(NEXT_BUTTONS[o.status] || []).map(([next, label]) => (
                <button key={next} className={next === "cancelled" ? "cancel-btn" : "act-btn"} onClick={() => setStatus(o.id, next)}>
                  {label}
                </button>
              ))}
            </div>
          ))}
          {orders && orders.finishedToday.filter((o) => o.status !== "cancelled").length > 0 && (
            <div>
              <h4>Finished today</h4>
              {orders.finishedToday
                .filter((o) => o.status !== "cancelled")
                .map((o) => (
                  <div className="order-card" key={o.id}>
                    <div className="cart-row">
                      <span>{o.orderNumber} | {o.customerName}</span>
                      <span className={"status status-" + o.status}>{o.status}</span>
                    </div>
                    {o.status === "ready" && (
                      <button className="act-btn" onClick={() => setStatus(o.id, "completed")}>Complete</button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* PART2_HERE */}
            {tab === "walkin" && (
        <div>
          <p className="note">For people who come to the counter. No account needed. Payment is cash at the counter.</p>
          <input
            className="wide"
            style={{ marginBottom: "12px" }}
            placeholder="🔍 Search food for walk-in order..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
          />
          {filteredMenu.filter((m) => m.isAvailable).map((m) => (
            <div className="cart-row" key={m.id}>
              <span>{m.name} (Rs {m.price}, stock {m.quantityAvailable})</span>
              <input
                type="number" min="0" max="10" className="qty"
                value={walkinCart[m.id] || 0}
                onChange={(e) => setWalkinCart({ ...walkinCart, [m.id]: Number(e.target.value) })}
              />
            </div>
          ))}
          <label className="note">Customer name or token (optional)</label>
          <input className="wide" value={walkinName} onChange={(e) => setWalkinName(e.target.value)} />
          <label className="note">
            <input type="checkbox" checked={walkinStaff} onChange={(e) => setWalkinStaff(e.target.checked)} />
            {" "}Teacher / staff order
          </label>
          <button className="order-btn" onClick={addWalkin}>Add walk-in order</button>
        </div>
      )}

      {tab === "menu" && (
        <div>
          <form onSubmit={saveFood} className="admin-form">
            <h4>{form.id ? "Edit food item" : "Add food item"}</h4>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Category (Snacks, Meals...)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            <input placeholder="Price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input placeholder="Quantity available" type="number" min="0" value={form.quantityAvailable} onChange={(e) => setForm({ ...form, quantityAvailable: e.target.value })} required />
            <input placeholder="Image link (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <label><input type="checkbox" checked={form.isVeg} onChange={(e) => setForm({ ...form, isVeg: e.target.checked })} /> Vegetarian</label>
            <label><input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} /> Available</label>
            <button className="order-btn" type="submit">{form.id ? "Save changes" : "Add item"}</button>
            {form.id && <button type="button" className="cancel-btn" onClick={() => setForm(emptyForm)}>Cancel edit</button>}
          </form>

          <input
            className="wide"
            style={{ marginBottom: "12px" }}
            placeholder="🔍 Search food items to edit or delete..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
          />

          {filteredMenu.map((m) => (
            <div className="order-card" key={m.id}>
              <div className="cart-row">
                <span>{m.name} | {m.category} | Rs {m.price} {m.isVeg ? "(Veg)" : "(Non-Veg)"}</span>
                <span>{m.isAvailable ? "Available" : "Hidden"}</span>
              </div>
              <button className="act-btn" onClick={() => setForm({ ...m })}>Edit</button>
              <button className="cancel-btn" onClick={() => deleteFood(m.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === "inventory" && (
        <div>
          <p className="note">Items at or below 5 are marked low stock.</p>
          <input
            className="wide"
            style={{ marginBottom: "12px" }}
            placeholder="🔍 Search inventory by name or category..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
          />
          {filteredMenu.map((m) => (
            <div className="cart-row" key={m.id}>
              <span>{m.name} {m.lowStock && <strong style={{ color: "#dc2626" }}>LOW STOCK</strong>}</span>
              <span>
                <input
                  type="number" min="0" className="qty" defaultValue={m.quantityAvailable}
                  onBlur={(e) => {
                    const q = Number(e.target.value);
                    if (q !== m.quantityAvailable) quickUpdate(m, { quantityAvailable: q });
                  }}
                />
                <button className="act-btn" onClick={() => quickUpdate(m, { isAvailable: !m.isAvailable })}>
                  {m.isAvailable ? "Mark unavailable" : "Mark available"}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "analytics" && stats && (
        <div>
          <div className="stat-row">
            <div className="stat"><span>Total orders</span><strong>{stats.totalOrders}</strong></div>
            <div className="stat"><span>Total sales</span><strong>Rs {stats.totalSales}</strong></div>
          </div>
          <h4>Daily sales (last 7 days)</h4>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={stats.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} /><YAxis /><Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#4338ca" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <h4>Most popular items</h4>
          {stats.popularItems.length === 0 ? <p>No sales yet.</p> : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={stats.popularItems}>
                  <XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip />
                  <Bar dataKey="quantity" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <h4>Demand by hour</h4>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={stats.demandByHour}>
                <XAxis dataKey="hour" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="orders" fill="#4338ca" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <h4>Orders by status</h4>
          <p className="note">
            {Object.entries(stats.ordersByStatus).map(([s, n]) => s + ": " + n).join(" | ") || "No orders yet"}
          </p>
          <h4>Low stock</h4>
          <p className="note">
            {stats.lowStockItems.map((i) => i.name + " (" + i.quantityAvailable + ")").join(", ") || "None"}
          </p>
          <h4>Unsold this week</h4>
          <p className="note">{stats.unsoldThisWeek.join(", ") || "None"}</p>
          <p className="note">These are simple reports from order and inventory data. They are not predictions.</p>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
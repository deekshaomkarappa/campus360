import { useState, useEffect } from "react";
import axios from "axios";

function CrowdMeter() {
  const [queueInfo, setQueueInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  function fetchQueue() {
    axios
      .get("/api/queue")
      .then((res) => {
        setQueueInfo(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading || !queueInfo) return null;

  const { pendingOrders, workload, estimatedWaitMinutes, priorityNote } = queueInfo;

  const workloadConfig = {
    Low: { color: "#16a34a", bg: "#dcfce7", border: "#86efac", label: "Low Crowd", icon: "🟢" },
    Medium: { color: "#d97706", bg: "#fef3c7", border: "#fde68a", label: "Moderate Rush", icon: "🟡" },
    High: { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", label: "Heavy Rush", icon: "🔴" },
  };

  const current = workloadConfig[workload] || workloadConfig.Low;

  return (
    <div
      className="crowd-meter"
      style={{
        backgroundColor: current.bg,
        borderColor: current.border,
      }}
    >
      <div className="crowd-header">
        <span className="crowd-badge" style={{ backgroundColor: current.color }}>
          {current.icon} {current.label}
        </span>
        <span className="crowd-stat">
          Queue: <strong>{pendingOrders} {pendingOrders === 1 ? "order" : "orders"}</strong>
        </span>
        <span className="crowd-stat">
          Est. Wait: <strong>~{estimatedWaitMinutes} min</strong>
        </span>
      </div>
      <p className="crowd-subtext">{priorityNote}</p>
    </div>
  );
}

export default CrowdMeter;


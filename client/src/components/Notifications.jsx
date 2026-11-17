import { useState, useEffect, useRef } from "react";
import axios from "axios";

// Melodic 2-tone chime using Web Audio API (no external sound files required)
function playReadyChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // Tone 2: A5 (880 Hz) - slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.75);
  } catch {
    // Audio context may require initial user click in some browsers
  }
}

function Notifications({ refreshKey }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [audioBanner, setAudioBanner] = useState("");
  const seenIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  function loadNotifications() {
    axios
      .get("/api/notifications")
      .then((res) => {
        const list = res.data;
        // Detect newly arrived "ready" notifications
        if (!initialLoadRef.current) {
          const newReady = list.find(
            (n) => n.type === "ready" && !n.isRead && !seenIdsRef.current.has(n.id)
          );
          if (newReady) {
            playReadyChime();
            setAudioBanner(newReady.message);
            setTimeout(() => setAudioBanner(""), 6000);
          }
        }
        list.forEach((n) => seenIdsRef.current.add(n.id));
        initialLoadRef.current = false;
        setNotifications(list);
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markAllRead() {
    axios
      .post("/api/notifications/read")
      .then(() => {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      })
      .catch(() => {});
  }

  const typeIcons = {
    confirmed: "📝",
    accepted: "👨‍🍳",
    ready: "🔔",
    cancelled: "❌",
  };

  return (
    <div className="notifications-wrapper">
      {audioBanner && (
        <div className="audio-ready-toast" onClick={() => setOpen(true)}>
          🔔 <strong>Food is Ready!</strong> {audioBanner}
        </div>
      )}

      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) {
            markAllRead();
          }
        }}
        title="View Notifications"
      >
        🔔 Notifications
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <strong>Notifications</strong>
            {notifications.length > 0 && (
              <button className="notif-clear-btn" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <p className="notif-empty">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.isRead ? "read" : "unread"}`}
                >
                  <span className="notif-icon">{typeIcons[n.type] || "ℹ️"}</span>
                  <div className="notif-content">
                    <p className="notif-message">{n.message}</p>
                    <span className="notif-time">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;

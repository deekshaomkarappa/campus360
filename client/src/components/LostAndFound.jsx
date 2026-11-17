import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const CATEGORY_DEFINITIONS = [
  {
    name: "Water Bottle",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
    icon: "🍶",
    color: "#0284c7",
    subtext: "Flasks, tumblers & sippers",
  },
  {
    name: "Bag",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
    icon: "🎒",
    color: "#4f46e5",
    subtext: "Backpacks, laptop sleeves & totes",
  },
  {
    name: "Calculator",
    image: "https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=600&q=80",
    icon: "🧮",
    color: "#0d9488",
    subtext: "Scientific & lab calculators",
  },
  {
    name: "ID Card",
    image: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=600&q=80",
    icon: "🪪",
    color: "#d97706",
    subtext: "Campus IDs, bus & library cards",
  },
  {
    name: "Books",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    icon: "📚",
    color: "#b45309",
    subtext: "Textbooks, notebooks & records",
  },
  {
    name: "Keys",
    image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80",
    icon: "🔑",
    color: "#e11d48",
    subtext: "Bike, scooter & room keys",
  },
  {
    name: "Earbuds",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
    icon: "🎧",
    color: "#7c3aed",
    subtext: "AirPods, TWS earbuds & pods",
  },
  {
    name: "Wallet",
    image: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80",
    icon: "👛",
    color: "#c2410c",
    subtext: "Wallets, purses & cardholders",
  },
  {
    name: "Mobile Phone",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
    icon: "📱",
    color: "#2563eb",
    subtext: "Smartphones & phone accessories",
  },
  {
    name: "Other Items",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80",
    icon: "📦",
    color: "#475569",
    subtext: "Glasses, umbrellas & chargers",
  },
];

const CATEGORIES = [
  "All",
  ...CATEGORY_DEFINITIONS.map((c) => c.name),
];

function getCategoryMeta(categoryName) {
  const normalized = (categoryName || "").trim().toLowerCase();
  const directMatch = CATEGORY_DEFINITIONS.find(
    (c) => c.name.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  // Backwards compatibility mappings for older database items
  if (normalized.includes("electronics") || normalized.includes("phone"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Mobile Phone") || CATEGORY_DEFINITIONS[8];
  if (normalized.includes("id") || normalized.includes("card"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "ID Card") || CATEGORY_DEFINITIONS[3];
  if (normalized.includes("wallet"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Wallet") || CATEGORY_DEFINITIONS[7];
  if (normalized.includes("bag"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Bag") || CATEGORY_DEFINITIONS[1];
  if (normalized.includes("bottle") || normalized.includes("lunchbox"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Water Bottle") || CATEGORY_DEFINITIONS[0];
  if (normalized.includes("book") || normalized.includes("stationery"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Books") || CATEGORY_DEFINITIONS[4];
  if (normalized.includes("key"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Keys") || CATEGORY_DEFINITIONS[5];
  if (normalized.includes("earbud") || normalized.includes("headphone"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Earbuds") || CATEGORY_DEFINITIONS[6];
  if (normalized.includes("calc"))
    return CATEGORY_DEFINITIONS.find((c) => c.name === "Calculator") || CATEGORY_DEFINITIONS[2];

  return CATEGORY_DEFINITIONS[9]; // Other Items
}

const CAMPUS_LOCATIONS = [
  "All Locations",
  "Central Library 1st Floor",
  "Central Library 2nd Floor",
  "Main Canteen / Food Court",
  "CS Lab 1 / 2",
  "EC / Mechanical Labs",
  "Main Block Seminar Hall",
  "Auditorium",
  "Sports Ground / Gymkhana",
  "Student Parking Lot B",
  "Admin Block / Dean Office",
];

const emptyReportForm = {
  title: "",
  type: "lost",
  category: "Water Bottle",
  location: "Central Library 1st Floor",
  customLocation: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  imageUrl: "",
  contactPhone: "",
  secretQuestion: "",
  secretAnswer: "",
};

function LostAndFound({ user }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'lost' | 'found' | 'radar' | 'my'
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Modals & Image Upload States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState(emptyReportForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  const fileInputRef = useRef(null);

  // Claim & Match modals
  const [claimModalItem, setClaimModalItem] = useState(null);
  const [claimAnswer, setClaimAnswer] = useState("");
  const [matchesModalItem, setMatchesModalItem] = useState(null);
  const [modalMatches, setModalMatches] = useState([]);
  const [actionMessage, setActionMessage] = useState("");

  function notify(msg) {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(""), 5000);
  }

  function fetchStats() {
    axios
      .get("/api/lost-found/stats")
      .then((res) => setStats(res.data))
      .catch(() => {});
  }

  const loadData = useCallback((searchOverride) => {
    setLoading(true);
    if (activeTab === "my") {
      axios
        .get("/api/lost-found/my")
        .then((res) => {
          setItems(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }

    let url = "/api/lost-found";
    const params = new URLSearchParams();
    if (activeTab === "lost") params.append("type", "lost");
    if (activeTab === "found") params.append("type", "found");
    if (selectedCategory !== "All") params.append("category", selectedCategory);
    const searchVal = typeof searchOverride === "string" ? searchOverride : searchQuery;
    if (searchVal.trim()) params.append("search", searchVal.trim());

    if (params.toString()) url += `?${params.toString()}`;

    axios
      .get(url)
      .then((res) => {
        setItems(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [activeTab, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // AI Natural Language Search
  function handleAiSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    setIsAiSearching(true);
    axios
      .get(`/api/lost-found/ai-search?q=${encodeURIComponent(searchQuery.trim())}`)
      .then((res) => {
        setItems(res.data.items || []);
        setIsAiSearching(false);
      })
      .catch(() => {
        setIsAiSearching(false);
        loadData();
      });
  }

  // Handle Photo Selection & Validation
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setImageUploadError("Only JPG, JPEG, PNG, and WEBP formats are supported.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError("Image file size must be less than 5MB.");
      return;
    }

    setImageUploadError("");
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // Remove Photo from form
  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview("");
    setImageUploadError("");
    setReportForm((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Open Report Modal pre-populated with given category
  function openReportModal(type = "lost", category = "Water Bottle") {
    setReportForm({
      ...emptyReportForm,
      type,
      category,
    });
    setImageFile(null);
    setImagePreview("");
    setImageUploadError("");
    setShowReportModal(true);
  }

  // Submit report with optional image upload
  async function handleReportSubmit(e) {
    e.preventDefault();
    if (!user) {
      alert("Please log in below to report a lost or found item.");
      return;
    }

    setUploadingImage(true);
    let finalImageUrl = reportForm.imageUrl || "";

    try {
      // If user selected a new file, upload it first to /api/upload
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await axios.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalImageUrl = uploadRes.data.imageUrl;
      }

      const loc = reportForm.customLocation.trim() || reportForm.location;

      const res = await axios.post("/api/lost-found", {
        ...reportForm,
        imageUrl: finalImageUrl,
        location: loc,
      });

      notify(
        res.data.aiMatchDetected
          ? `⚡ Item posted! AI found a match with ${res.data.matchScore}% confidence!`
          : "✅ Item reported successfully!"
      );
      setShowReportModal(false);
      setReportForm(emptyReportForm);
      setImageFile(null);
      setImagePreview("");
      setImageUploadError("");
      loadData();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to submit report");
    } finally {
      setUploadingImage(false);
    }
  }

  // Open AI matches modal
  function openMatchesModal(item) {
    setMatchesModalItem(item);
    setModalMatches([]);
    axios
      .get(`/api/lost-found/matches/${item._id}`)
      .then((res) => {
        setModalMatches(res.data.matches || []);
      })
      .catch(() => {});
  }

  // Submit claim
  function handleClaimSubmit(e) {
    e.preventDefault();
    if (!claimModalItem) return;

    axios
      .post(`/api/lost-found/${claimModalItem._id}/claim`, {
        answer: claimAnswer,
      })
      .then((res) => {
        notify(res.data.message);
        setClaimModalItem(null);
        setClaimAnswer("");
        loadData();
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Failed to submit claim");
      });
  }

  // Mark as resolved / reunited
  function handleResolve(id) {
    if (!window.confirm("Mark this item as successfully reunited with its owner?")) return;
    axios
      .patch(`/api/lost-found/${id}/resolve`)
      .then((res) => {
        notify(res.data.message);
        loadData();
        fetchStats();
      })
      .catch((err) => alert(err.response?.data?.message || "Error"));
  }

  // Delete item
  function handleDelete(id) {
    if (!window.confirm("Delete this report?")) return;
    axios
      .delete(`/api/lost-found/${id}`)
      .then((res) => {
        notify(res.data.message);
        loadData();
        fetchStats();
      })
      .catch((err) => alert(err.response?.data?.message || "Error"));
  }

  // Filter items by location in UI if selected
  const displayedItems = items.filter((item) => {
    if (selectedLocation === "All Locations") return true;
    return item.location.toLowerCase().includes(selectedLocation.toLowerCase());
  });

  // AI Match Radar paired items
  const matchedLostItems = items.filter(
    (i) => i.type === "lost" && i.status === "matched" && i.matchedItem
  );

  return (
    <div className="lostfound-module">
      {/* Module Title Banner */}
      <div className="lf-header">
        <div className="lf-title-badge">🔍 Campus 360 AI Module</div>
        <h2>AI Lost & Found Hub</h2>
        <p>
          Smart image-powered reporting & semantic AI auto-matching for lost and found campus belongings.
        </p>
      </div>

      {actionMessage && <div className="lf-toast-alert">{actionMessage}</div>}

      {/* Quick Statistics Bar */}
      {stats && (
        <div className="lf-stats-bar">
          <div className="lf-stat-card">
            <span>Total Reports</span>
            <strong>{stats.totalItems}</strong>
          </div>
          <div className="lf-stat-card lost-stat">
            <span>Lost Items</span>
            <strong>{stats.totalLost}</strong>
          </div>
          <div className="lf-stat-card found-stat">
            <span>Found Items</span>
            <strong>{stats.totalFound}</strong>
          </div>
          <div className="lf-stat-card match-stat">
            <span>Active AI Matches ⚡</span>
            <strong>{stats.activeMatches}</strong>
          </div>
          <div className="lf-stat-card success-stat">
            <span>Reunited Owners 🎉</span>
            <strong>{stats.claimed}</strong>
          </div>
        </div>
      )}

      {/* Main Action Bar */}
      <div className="lf-action-bar">
        <button
          type="button"
          className="lf-btn lf-btn-lost"
          onClick={() => openReportModal("lost", selectedCategory !== "All" ? selectedCategory : "Water Bottle")}
        >
          🔴 Report Lost Item
        </button>
        <button
          type="button"
          className="lf-btn lf-btn-found"
          onClick={() => openReportModal("found", selectedCategory !== "All" ? selectedCategory : "Water Bottle")}
        >
          🟢 Report Found Item
        </button>
        <button
          type="button"
          className={`lf-btn lf-btn-radar ${activeTab === "radar" ? "active" : ""}`}
          onClick={() => setActiveTab("radar")}
        >
          ⚡ Open AI Match Radar
        </button>
      </div>

      {/* ITEM CATEGORY GALLERY (FEATURE 1) */}
      <div className="lf-gallery-container">
        <div className="lf-gallery-header">
          <div>
            <h3>📸 Item Category Gallery</h3>
            <p className="lf-gallery-sub">
              Click any category card to view items or quick-report your belongings:
            </p>
          </div>
          {selectedCategory !== "All" && (
            <button
              type="button"
              className="lf-clear-cat-btn"
              onClick={() => setSelectedCategory("All")}
            >
              Show All Categories ↺
            </button>
          )}
        </div>

        <div className="lf-category-grid">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <div
                key={cat.name}
                className={`lf-category-card ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  // Toggle selection or select
                  setSelectedCategory(isSelected ? "All" : cat.name);
                }}
                title={`Click to filter by ${cat.name}`}
              >
                <div className="lf-cat-image-wrap">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="lf-cat-img"
                    loading="lazy"
                  />
                  <span className="lf-cat-icon-badge">{cat.icon}</span>
                  {isSelected && (
                    <span className="lf-cat-selected-pill">✓ Selected</span>
                  )}
                </div>
                <div className="lf-cat-content">
                  <h4 className="lf-cat-name">{cat.name}</h4>
                  <p className="lf-cat-subtext">{cat.subtext}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Natural Language Search Bar */}
      <form className="lf-search-form" onSubmit={handleAiSearch}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input lf-search-input"
            placeholder="🧠 Ask AI (e.g., 'lost blue water bottle in library' or 'found casio calculator')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setSearchQuery("");
                loadData("");
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button type="submit" className="lf-search-submit-btn">
          {isAiSearching ? "Searching..." : "Ask AI 🔍"}
        </button>
      </form>

      {/* Quick Search Suggestions */}
      <div className="lf-quick-prompts">
        <span className="quick-label">⚡ AI Prompts:</span>
        {[
          "Casio Calculator",
          "Water Bottle",
          "College ID Card",
          "Boat Earbuds",
          "Bike Keys",
          "Black Laptop Bag",
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="quick-tag"
            onClick={() => {
              setSearchQuery(prompt);
              axios
                .get(`/api/lost-found/ai-search?q=${encodeURIComponent(prompt)}`)
                .then((r) => setItems(r.data.items || []));
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="lf-tabs-container">
        {[
          ["all", "All Items"],
          ["lost", "🔴 Lost Items"],
          ["found", "🟢 Found Items"],
          ["radar", "⚡ AI Match Radar"],
          ["my", "👤 My Reports"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`lf-tab-btn ${activeTab === key ? "active" : ""}`}
            onClick={() => {
              setActiveTab(key);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters row: Category pills & Location select */}
      {activeTab !== "radar" && (
        <div className="lf-filter-row">
          <div className="category-pills">
            {CATEGORIES.map((cat) => (
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

          <select
            className="lf-location-select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {CAMPUS_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                📍 {loc}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading & Empty States */}
      {loading && <p className="lf-loading-text">Scanning Campus 360 database...</p>}

      {/* TAB: AI MATCH RADAR */}
      {activeTab === "radar" && (
        <div className="lf-radar-section">
          <div className="lf-radar-header">
            <h3>⚡ AI Matchmaker Radar</h3>
            <p>
              The AI automatically cross-references Lost and Found items based on object descriptors, colors, campus zones, and timing.
            </p>
          </div>

          {matchedLostItems.length === 0 ? (
            <div className="no-food-box">
              <p>No active AI matches found at the moment.</p>
              <button
                type="button"
                className="reset-search-btn"
                onClick={() => setActiveTab("all")}
              >
                Browse All Items
              </button>
            </div>
          ) : (
            <div className="lf-radar-grid">
              {matchedLostItems.map((lost) => {
                const meta = getCategoryMeta(lost.category);
                return (
                  <div key={lost._id} className="lf-radar-pair-card">
                    <div className="lf-radar-left">
                      <div className="lf-radar-thumb-wrap">
                        <img
                          src={lost.imageUrl || meta.image}
                          alt={lost.title}
                          className="lf-radar-thumb"
                        />
                      </div>
                      <span className="badge nonveg">🔴 LOST</span>
                      <h4>{lost.title}</h4>
                      <p className="note">📍 {lost.location}</p>
                      <p className="lf-desc-snippet">{lost.description}</p>
                      <span className="lf-reporter-tag">By: {lost.reporterName}</span>
                    </div>

                    <div className="lf-radar-center">
                      <div className="lf-match-pulse">
                        <strong>⚡ HIGH AI MATCH</strong>
                        <span className="lf-confidence-badge">Score: 90%+</span>
                      </div>
                      <div className="lf-radar-arrow">⇄</div>
                      <button
                        type="button"
                        className="act-btn"
                        onClick={() => openMatchesModal(lost)}
                      >
                        Inspect AI Details
                      </button>
                    </div>

                    <div className="lf-radar-right">
                      <span className="badge veg">🟢 FOUND MATCH</span>
                      <h4>Matching Found Item</h4>
                      <p className="note">Available in Custody</p>
                      <button
                        type="button"
                        className="order-btn"
                        style={{ marginTop: "12px", width: "100%" }}
                        onClick={() => setClaimModalItem(lost)}
                      >
                        Claim & Verify Owner
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: STANDARD ITEMS GRID */}
      {activeTab !== "radar" && (
        <>
          {displayedItems.length === 0 && !loading && (
            <div className="no-food-box">
              <p>No items found under this filter.</p>
              <button
                type="button"
                className="reset-search-btn"
                onClick={() => {
                  setSelectedCategory("All");
                  setSelectedLocation("All Locations");
                  setSearchQuery("");
                  loadData();
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}

          <div className="lf-items-grid">
            {displayedItems.map((item) => {
              const isOwner = user && String(item.reportedBy) === String(user.id);
              const meta = getCategoryMeta(item.category);
              const itemPhoto = item.imageUrl || meta.image;
              const hasUploadedPhoto = Boolean(item.imageUrl);

              return (
                <div key={item._id} className={`lf-card ${item.type}-card`}>
                  {/* Photo Display with Click-to-Zoom Lightbox */}
                  <div
                    className="lf-card-image-box"
                    onClick={() =>
                      setActiveLightboxImg({
                        url: itemPhoto,
                        title: item.title,
                        isActual: hasUploadedPhoto,
                        category: item.category,
                      })
                    }
                    title="Click to view full photograph"
                  >
                    <img
                      src={itemPhoto}
                      alt={item.title}
                      className="lf-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = meta.image;
                      }}
                    />
                    <div className="lf-image-badge-wrap">
                      {hasUploadedPhoto ? (
                        <span className="lf-img-tag tag-actual">📷 Actual Photo</span>
                      ) : (
                        <span className="lf-img-tag tag-reference">🖼️ Reference Photo</span>
                      )}
                    </div>
                    <div className="lf-img-hover-overlay">
                      <span>🔍 View Full Photo</span>
                    </div>
                  </div>

                  <div className="lf-card-body">
                    <div className="card-top-badges">
                      <span
                        className={`badge ${
                          item.type === "lost" ? "nonveg" : "veg"
                        }`}
                      >
                        {item.type === "lost" ? "🔴 LOST" : "🟢 FOUND"}
                      </span>
                      <span
                        className="badge"
                        style={{ background: meta.color || "#4338ca" }}
                      >
                        {meta.icon} {item.category}
                      </span>
                      {item.status === "matched" && (
                        <span className="badge special-badge">⚡ AI Matched</span>
                      )}
                      {item.status === "claimed" && (
                        <span
                          className="badge"
                          style={{ background: "#16a34a" }}
                        >
                          🎉 Reunited
                        </span>
                      )}
                    </div>

                    <h3>{item.title}</h3>

                    <div className="lf-meta-details">
                      <p className="lf-item-location">
                        📍 <strong>{item.location}</strong>
                      </p>
                      <p className="lf-item-date">
                        🕒 {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <p className="lf-item-desc">{item.description}</p>

                    {/* AI Extracted Tags */}
                    {item.aiKeywords && item.aiKeywords.length > 0 && (
                      <div className="lf-keywords-row">
                        {item.aiKeywords.slice(0, 4).map((kw) => (
                          <span key={kw} className="lf-kw-chip">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="lf-card-actions">
                      <button
                        type="button"
                        className="lf-inspect-btn"
                        onClick={() => openMatchesModal(item)}
                      >
                        ⚡ Check AI Matches
                      </button>

                      {item.type === "found" && item.status !== "claimed" && !isOwner && (
                        <button
                          type="button"
                          className="lf-claim-btn"
                          onClick={() => setClaimModalItem(item)}
                        >
                          ✋ This is Mine! (Claim)
                        </button>
                      )}

                      {isOwner && item.status !== "claimed" && (
                        <button
                          type="button"
                          className="lf-resolve-btn"
                          onClick={() => handleResolve(item._id)}
                        >
                          🎉 Mark as Reunited
                        </button>
                      )}

                      {isOwner && (
                        <button
                          type="button"
                          className="cancel-btn"
                          style={{ marginTop: "4px" }}
                          onClick={() => handleDelete(item._id)}
                        >
                          Remove Report
                        </button>
                      )}
                    </div>

                    <div className="lf-card-footer">
                      <span>
                        Reported by: <strong>{item.reporterName}</strong>
                      </span>
                      {item.contactPhone && (
                        <span>📞 {item.contactPhone}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* REPORT MODAL (WITH IMAGE UPLOADER & PREVIEW) */}
      {showReportModal && (
        <div className="lf-modal-backdrop" onClick={() => setShowReportModal(false)}>
          <div className="lf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lf-modal-header">
              <h3>
                {reportForm.type === "lost"
                  ? "🔴 Report a Lost Item"
                  : "🟢 Report a Found Item"}
              </h3>
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setShowReportModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="lf-modal-form">
              {/* Type selector */}
              <label>Report Type *</label>
              <div className="role-selector">
                <label className="role-option">
                  <input
                    type="radio"
                    name="reportType"
                    value="lost"
                    checked={reportForm.type === "lost"}
                    onChange={() => setReportForm({ ...reportForm, type: "lost" })}
                  />
                  🔴 I Lost an Item
                </label>
                <label className="role-option">
                  <input
                    type="radio"
                    name="reportType"
                    value="found"
                    checked={reportForm.type === "found"}
                    onChange={() => setReportForm({ ...reportForm, type: "found" })}
                  />
                  🟢 I Found an Item
                </label>
              </div>

              {/* Category Selection Visual Selector */}
              <label>Select Item Category *</label>
              <div className="lf-form-category-pills">
                {CATEGORY_DEFINITIONS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={`lf-form-cat-chip ${reportForm.category === c.name ? "active" : ""}`}
                    onClick={() => setReportForm({ ...reportForm, category: c.name })}
                  >
                    <span>{c.icon}</span> {c.name}
                  </button>
                ))}
              </div>

              {/* Item Name */}
              <label>Item Name / Title *</label>
              <input
                type="text"
                placeholder="e.g. Casio fx-991ES Plus Scientific Calculator"
                value={reportForm.title}
                onChange={(e) =>
                  setReportForm({ ...reportForm, title: e.target.value })
                }
                required
              />

              {/* Detailed Description */}
              <label>Detailed Description (Color, Brand, Features, Markings) *</label>
              <textarea
                rows={3}
                placeholder="Describe color, brand, scratch marks, stickers, unique features for AI matching..."
                value={reportForm.description}
                onChange={(e) =>
                  setReportForm({ ...reportForm, description: e.target.value })
                }
                required
              />

              {/* PHOTO UPLOAD SECTION (FEATURE 2) */}
              <div className="lf-photo-upload-section">
                <label>
                  📷 Upload Item Photograph <span className="lf-optional-tag">(Optional)</span>
                </label>
                <p className="note" style={{ margin: "2px 0 8px" }}>
                  Upload an actual photo of the item. Supported: JPG, JPEG, PNG, WEBP (Max 5MB).
                </p>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                  onChange={handleImageSelect}
                />

                {imageUploadError && (
                  <div className="lf-upload-error-msg">{imageUploadError}</div>
                )}

                {!imagePreview ? (
                  <div
                    className="lf-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="lf-dropzone-icon">📸</div>
                    <div className="lf-dropzone-text">
                      <strong>Click to Upload Photograph</strong>
                      <span>or drag and drop your image file here</span>
                    </div>
                    <button
                      type="button"
                      className="lf-upload-btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Choose Image File
                    </button>
                  </div>
                ) : (
                  <div className="lf-preview-container">
                    <div className="lf-preview-thumb-box">
                      <img
                        src={imagePreview}
                        alt="Upload preview"
                        className="lf-preview-thumb"
                      />
                    </div>
                    <div className="lf-preview-info">
                      <span className="lf-preview-filename">
                        📎 {imageFile?.name || "Uploaded photo"}
                      </span>
                      {imageFile?.size && (
                        <span className="lf-preview-filesize">
                          Size: {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      )}
                      <div className="lf-preview-actions">
                        <button
                          type="button"
                          className="lf-btn-replace"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          🔄 Replace Photo
                        </button>
                        <button
                          type="button"
                          className="lf-btn-remove"
                          onClick={handleRemoveImage}
                        >
                          ✕ Remove Photo
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <label>Campus Location / Spot *</label>
              <select
                value={reportForm.location}
                onChange={(e) =>
                  setReportForm({ ...reportForm, location: e.target.value })
                }
              >
                {CAMPUS_LOCATIONS.filter((l) => l !== "All Locations").map(
                  (loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  )
                )}
              </select>

              <input
                type="text"
                placeholder="Specific room, desk number, or spot (optional)"
                value={reportForm.customLocation}
                onChange={(e) =>
                  setReportForm({ ...reportForm, customLocation: e.target.value })
                }
              />

              {/* Date */}
              <label>Date Lost / Found</label>
              <input
                type="date"
                value={reportForm.date}
                onChange={(e) =>
                  setReportForm({ ...reportForm, date: e.target.value })
                }
              />

              {/* Contact Information */}
              <label>Contact Phone / Roll Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 9876543210 or 4MC21CS042"
                value={reportForm.contactPhone}
                onChange={(e) =>
                  setReportForm({ ...reportForm, contactPhone: e.target.value })
                }
              />

              {/* Anti-Theft Verification Question */}
              <div className="lf-secret-section">
                <label>🛡️ Ownership Secret Question (Anti-Theft Proof)</label>
                <p className="note" style={{ margin: "2px 0 6px" }}>
                  A verification question only the genuine owner can answer (e.g. sticker on back, lock screen wallpaper).
                </p>
                <input
                  type="text"
                  placeholder="e.g., What sticker is on the back?"
                  value={reportForm.secretQuestion}
                  onChange={(e) =>
                    setReportForm({
                      ...reportForm,
                      secretQuestion: e.target.value,
                    })
                  }
                />
              </div>

              <div className="lf-modal-footer">
                <button
                  type="submit"
                  className="order-btn"
                  disabled={uploadingImage}
                >
                  {uploadingImage
                    ? "Uploading & Publishing..."
                    : "Publish to Campus 360 & Run AI"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowReportModal(false)}
                  disabled={uploadingImage}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SIZE IMAGE LIGHTBOX MODAL */}
      {activeLightboxImg && (
        <div
          className="lf-lightbox-backdrop"
          onClick={() => setActiveLightboxImg(null)}
        >
          <div
            className="lf-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lf-lightbox-header">
              <div>
                <h4>{activeLightboxImg.title}</h4>
                <span
                  className={`lf-img-tag ${
                    activeLightboxImg.isActual ? "tag-actual" : "tag-reference"
                  }`}
                >
                  {activeLightboxImg.isActual
                    ? "📷 Actual Item Photo"
                    : `🖼️ Reference Photo (${activeLightboxImg.category})`}
                </span>
              </div>
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setActiveLightboxImg(null)}
              >
                ✕
              </button>
            </div>
            <div className="lf-lightbox-image-wrap">
              <img
                src={activeLightboxImg.url}
                alt={activeLightboxImg.title}
                className="lf-lightbox-img"
              />
            </div>
          </div>
        </div>
      )}

      {/* CLAIM OWNERSHIP MODAL */}
      {claimModalItem && (
        <div className="lf-modal-backdrop" onClick={() => setClaimModalItem(null)}>
          <div className="lf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lf-modal-header">
              <h3>Claim Item: "{claimModalItem.title}"</h3>
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setClaimModalItem(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="lf-modal-form">
              <p className="note">
                To prevent fraud, please prove genuine ownership by answering the verification question set by the custodian.
              </p>

              <div className="lf-question-card">
                <strong>Question:</strong>{" "}
                {claimModalItem.secretQuestion || "Please describe any unique details, stickers, or marks."}
              </div>

              <label>Your Proof / Answer *</label>
              <textarea
                rows={3}
                placeholder="Provide specific details that only the true owner would know..."
                value={claimAnswer}
                onChange={(e) => setClaimAnswer(e.target.value)}
                required
              />

              <div className="lf-modal-footer">
                <button type="submit" className="order-btn">
                  Submit Ownership Claim 📩
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setClaimModalItem(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI MATCHES INSPECTION MODAL */}
      {matchesModalItem && (
        <div className="lf-modal-backdrop" onClick={() => setMatchesModalItem(null)}>
          <div className="lf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="lf-modal-header">
              <h3>⚡ AI Match Analysis: "{matchesModalItem.title}"</h3>
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setMatchesModalItem(null)}
              >
                ✕
              </button>
            </div>

            <p className="note">
              Scanning opposite reports in the database using multi-factor semantic AI matching:
            </p>

            {modalMatches.length === 0 ? (
              <p className="note" style={{ color: "#d97706", padding: "16px 0" }}>
                No strong matches found in the database yet. The system will continue scanning automatically!
              </p>
            ) : (
              <div className="lf-matches-list">
                {modalMatches.map((m) => {
                  const meta = getCategoryMeta(m.item.category);
                  return (
                    <div key={m.item._id} className="lf-match-card">
                      <div className="lf-match-header">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <img
                            src={m.item.imageUrl || meta.image}
                            alt={m.item.title}
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "8px",
                              objectFit: "cover",
                            }}
                          />
                          <div>
                            <strong>{m.item.title}</strong>
                            <p className="note" style={{ margin: "2px 0 0" }}>
                              📍 {m.item.location} · {m.item.category}
                            </p>
                          </div>
                        </div>
                        <span className={`lf-score-pill score-${m.tier.toLowerCase()}`}>
                          {m.score}% Match ({m.tier})
                        </span>
                      </div>
                      <p className="lf-desc-snippet" style={{ marginTop: "10px" }}>
                        {m.item.description}
                      </p>
                      <div className="lf-match-reasons">
                        💡 <strong>AI Reason:</strong> {m.summary}
                      </div>
                      <div className="lf-match-actions">
                        <button
                          type="button"
                          className="order-btn"
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                          onClick={() => {
                            setMatchesModalItem(null);
                            setClaimModalItem(m.item);
                          }}
                        >
                          Claim Item
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="lf-modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setMatchesModalItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LostAndFound;
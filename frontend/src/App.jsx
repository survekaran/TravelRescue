import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// Vite exposes only variables prefixed with VITE_; this one is deliberately
// public and must contain only the API's public origin.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const TRIP_ID = 3;
const STORAGE_KEY = "travelrescue_auth";

function getStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const auth = getStoredAuth();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (auth?.access_token) {
    headers.Authorization = `Bearer ${auth.access_token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail =
      data?.detail ||
      data?.message ||
      `Request failed: ${response.status}`;

    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }

  return data;
}

/* =========================================================
   LOGIN
========================================================= */

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");

  const isSignup = mode === "signup";

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
  }

  async function handleSubmit(event) {
      event.preventDefault();
      setError("");

      if (isSignup && !name.trim()) {
        setError("Please enter your name.");
        return;
      }
    
      if (!email.trim() || !password) {
        setError("Please enter your email and password.");
        return;
      }
    
      if (isSignup && password.length < 12) {
        setError("Password must be at least 12 characters long.");
        return;
      }
    
      try {
        setLoading(true);
      
        const endpoint = isSignup
          ? "/auth/register"
          : "/auth/login";
      
        const payload = isSignup
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };
          
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      
        const result = await response.json();
      
        if (!response.ok) {
          throw new Error(
            result?.detail ||
              result?.message ||
              `${isSignup ? "Registration" : "Login"} failed`
          );
        }
      
        const authData = {
          access_token: result.access_token,
          token_type: result.token_type,
          user: result.user,
        };
      
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(authData)
        );
      
        onLogin(authData);
      } catch (err) {
        setError(
          err.message ||
            `Unable to ${
              isSignup ? "create your account" : "login"
            }.`
        );
      } finally {
        setLoading(false);
      }
    }   

  return (
    <div className="auth-page">
      <div className="auth-background-shape auth-shape-one" />
      <div className="auth-background-shape auth-shape-two" />

      <div className="auth-layout">
        <div className="auth-visual">
          <div className="auth-visual-content">
            <div className="logo-large">
              <span>TR</span>
            </div>

            <div className="auth-eyebrow">INTELLIGENT TRAVEL RECOVERY</div>

            <h1>
              Your journey.
              <br />
              <span>Our backup plan.</span>
            </h1>

            <p>
              TravelRescue monitors your itinerary, detects disruptions,
              understands cascading impact, and builds recovery plans before
              your journey falls apart.
            </p>

            <div className="auth-feature-list">
              <div>
                <span>✓</span>
                Real-time disruption monitoring
              </div>
              <div>
                <span>✓</span>
                Dependency-aware recovery
              </div>
              <div>
                <span>✓</span>
                Intelligent alternative planning
              </div>
            </div>
          </div>

          <div className="auth-route-card">
            <div className="mini-route-top">
              <span>MUM</span>
              <div className="mini-route-line">
                <span>✈</span>
              </div>
              <span>FCO</span>
            </div>

            <div className="mini-route-bottom">
              <span>Mumbai</span>
              <span>Rome</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-brand-row">
            <div className="brand-mark">TR</div>
            <div>
              <div className="brand-name">TravelRescue</div>
              <div className="brand-subtitle">
                Intelligent Travel Recovery
              </div>
            </div>
          </div>

          <div className="auth-heading">
            <span className="small-label">TRAVELER PORTAL</span>
            <h2>Welcome back</h2>
            <p>
              Sign in to monitor your journey and manage travel disruptions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {isSignup && (
              <label>
                <span>Full name</span>

                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                />
              </label>
            )}
              <label>
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label>
              <span>Password</span>
              <input type="password"
                placeholder={
                  isSignup
                    ? "Minimum 12 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  isSignup ? "new-password" : "current-password"
                }
                minLength={isSignup ? 12 : 1}
                />
              </label>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="submit"
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in to TravelRescue"}
              {!loading && <span>→</span>}
            </button>
          </form>
          <div
          style={{
            marginTop: "18px",
            textAlign: "center",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          {isSignup
            ? "Already have an account?"
            : "Don't have a TravelRescue account?"}{" "}
        
          <button
            type="button"
            onClick={() =>
              switchMode(isSignup ? "login" : "signup")
            }
            disabled={loading}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              color: "#4f46e5",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "inherit",
            }}
          >
            {isSignup ? "Sign in" : "Create account"}
          </button>
        </div>
          
          <div className="auth-security">
            <span>🔒</span>
            Secure JWT authenticated traveler portal
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "On time";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} min`;

  return `${hours}h ${mins}m`;
}

function getUpdatedDisruptionTime(disruption) {
  const delayMinutes = Number(disruption?.delay_minutes || 0);
  const originalValue = disruption?.old_start_time;
  const providerValue = disruption?.new_start_time;

  if (!originalValue) return providerValue || null;
  if (!delayMinutes) return providerValue || originalValue;

  const originalDate = new Date(originalValue);
  const providerDate = providerValue ? new Date(providerValue) : null;

  if (Number.isNaN(originalDate.getTime())) {
    return providerValue || originalValue;
  }

  // Some provider responses report the original scheduled timestamp while
  // separately reporting the delay in minutes. In that case, calculate the
  // displayed updated time so the dashboard does not show identical times.
  if (
    !providerDate ||
    Number.isNaN(providerDate.getTime()) ||
    Math.abs(providerDate.getTime() - originalDate.getTime()) < 60 * 1000
  ) {
    return new Date(
      originalDate.getTime() + delayMinutes * 60 * 1000
    ).toISOString();
  }

  return providerValue;
}

function getBookingStatusClass(status) {
  if (status === "REPLACED") return "booking-status-warning";
  if (status === "CANCELLED") return "booking-status-danger";
  return "booking-status-success";
}

function getBookingIcon(type) {
  switch (type?.toUpperCase()) {
    case "FLIGHT":
      return "✈";
    case "HOTEL":
      return "⌂";
    case "TRANSFER":
      return "🚗";
    case "ACTIVITY":
      return "◈";
    case "TRAIN":
      return "▰";
    case "BUS":
      return "▣";
    default:
      return "•";
  }
}

function getBookingLabel(type) {
  switch (type?.toUpperCase()) {
    case "FLIGHT":
      return "Flight";
    case "HOTEL":
      return "Hotel";
    case "TRANSFER":
      return "Transfer";
    case "ACTIVITY":
      return "Activity";
    case "TRAIN":
      return "Train";
    case "BUS":
      return "Bus";
    default:
      return type || "Booking";
  }
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({ activePage, setActivePage, user, onLogout }) {
  const navigation = [
    { id: "dashboard", icon: "⌂", label: "Dashboard" },
    { id: "trips", icon: "✈", label: "My Trips" },
    { id: "live", icon: "◉", label: "Live Updates" },
    { id: "disruptions", icon: "!", label: "Disruptions" },
    { id: "recovery", icon: "↗", label: "Recovery Plans" },
    { id: "bookings", icon: "▤", label: "Bookings" },
    { id: "assistant", icon: "✦", label: "AI Assistant" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">TR</div>
        <div>
          <strong>TravelRescue</strong>
          <span>Travel intelligence</span>
        </div>
      </div>

      <div className="sidebar-section-label">MAIN MENU</div>

      <nav className="sidebar-nav">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={`sidebar-link ${
              activePage === item.id ? "active" : ""
            }`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === "disruptions" && (
              <span className="sidebar-alert-dot" />
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-section-label">ACCOUNT</div>

      <button
        className={`sidebar-link ${
          activePage === "settings" ? "active" : ""
        }`}
        onClick={() => setActivePage("settings")}
      >
        <span className="sidebar-icon">⚙</span>
        <span>Settings</span>
      </button>

      <div className="sidebar-profile">
        <div className="profile-avatar">
          {(user?.name || "U").charAt(0).toUpperCase()}
        </div>

        <div className="profile-info">
          <strong>{user?.name || "Traveler"}</strong>
          <span>{user?.email || "Traveler account"}</span>
        </div>

        <button
          className="profile-logout"
          title="Logout"
          onClick={onLogout}
        >
          ↪
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   TOPBAR
========================================================= */

function Topbar({ onRefresh, refreshing, onMonitor, monitoring, user }) {
  return (
    <header className="main-topbar">
      <div className="mobile-brand">
        <div className="sidebar-logo">TR</div>
        <strong>TravelRescue</strong>
      </div>

      <div className="search-box">
        <span>⌕</span>
        <input placeholder="Search trips, bookings or destinations..." />
        <kbd>⌘ K</kbd>
      </div>

      <div className="topbar-actions">
        <div className="system-status">
          <span className="online-dot" />
          <span>System operational</span>
        </div>

        <button
          className="live-monitor-button"
          title="Check live flight status"
          onClick={onMonitor}
          disabled={monitoring || refreshing}
        >
          <span>◉</span>
          {monitoring ? "Checking..." : "Check live status"}
        </button>

        <button
          className="icon-button"
          title="Refresh"
          onClick={onRefresh}
          disabled={refreshing || monitoring}
        >
          {refreshing ? "…" : "↻"}
        </button>

        <button className="icon-button notification-button" title="Notifications">
          ♢
          <span />
        </button>

        <div className="topbar-user">
          <div className="topbar-avatar">
            {(user?.name || "U").charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user?.name || "Traveler"}</strong>
            <span>Traveler</span>
          </div>
          <span className="chevron">⌄</span>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   HERO
========================================================= */

function TripHero({
  bookings,
  flight,
  targetDisruption,
  onSimulate,
  simulating,
  applying,
}) {
  const origin =
    flight?.location ||
    flight?.origin ||
    "Mumbai";

  const destination =
    flight?.destination ||
    "Rome";

  return (
    <section className="trip-hero">
      <div className="hero-background-orb orb-one" />
      <div className="hero-background-orb orb-two" />

      <div className="hero-left">
        <div className="hero-breadcrumb">
          <span>MY TRIPS</span>
          <b>/</b>
          <span>ACTIVE JOURNEY</span>
        </div>

        <h1>
          {origin}
          <span className="hero-arrow">→</span>
          {destination}
        </h1>

        <p>
          Your journey is being monitored continuously.
          TravelRescue will identify disruption risks and build recovery
          options when your plans change.
        </p>

        <div className="hero-meta">
          <div>
            <span className="hero-meta-icon">◷</span>
            <div>
              <small>JOURNEY STATUS</small>
              <strong>Actively monitored</strong>
            </div>
          </div>

          <div>
            <span className="hero-meta-icon">▤</span>
            <div>
              <small>BOOKINGS</small>
              <strong>{bookings.length} connected</strong>
            </div>
          </div>

          <div>
            <span className="hero-meta-icon">✦</span>
            <div>
              <small>RECOVERY</small>
              <strong>
                {targetDisruption?.status === "RESOLVED"
                  ? "Resolved"
                  : targetDisruption
                    ? "Monitoring"
                    : "Ready"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-route-visual">
        <div className="route-circle route-start">
          <span>🇮🇳</span>
        </div>

        <div className="route-path">
          <span className="route-dot" />
          <div className="route-line-main">
            <span>✈</span>
          </div>
          <span className="route-dot" />
        </div>

        <div className="route-circle route-end">
          <span>🇮🇹</span>
        </div>

        <div className="route-labels">
          <strong>Mumbai</strong>
          <span>Rome</span>
        </div>
      </div>

      <button
        className="hero-disruption-button"
        onClick={onSimulate}
        disabled={
          simulating ||
          applying ||
          !flight ||
          targetDisruption?.status === "ACTIVE"
        }
      >
        <span>⚡</span>
        {simulating
          ? "Detecting disruption..."
          : targetDisruption?.status === "ACTIVE"
            ? "Disruption active"
            : "Simulate flight delay"}
      </button>
    </section>
  );
}

/* =========================================================
   DISRUPTION CARD
========================================================= */

function DisruptionCard({ disruption, flight, impact }) {
  if (!disruption) {
    return (
      <section className="no-disruption-card">
        <div className="safe-icon">✓</div>
        <div>
          <span className="small-label">JOURNEY STATUS</span>
          <h3>Your itinerary is currently clear</h3>
          <p>
            No active disruptions have been detected across your connected
            bookings.
          </p>
        </div>
        <span className="safe-pill">ALL CLEAR</span>
      </section>
    );
  }

  const resolved = disruption.status === "RESOLVED";
  const updatedStartTime = getUpdatedDisruptionTime(disruption);

  return (
    <section
      className={`disruption-card ${
        resolved ? "disruption-resolved" : ""
      }`}
    >
      <div className="disruption-main">
        <div className={`disruption-symbol ${resolved ? "resolved" : ""}`}>
          {resolved ? "✓" : "!"}
        </div>

        <div className="disruption-copy">
          <div className="disruption-title-row">
            <span className="small-label">
              {resolved ? "RECOVERY COMPLETED" : "DISRUPTION DETECTED"}
            </span>

            <span
              className={`severity-pill severity-${(
                disruption.severity || "medium"
              ).toLowerCase()}`}
            >
              {disruption.severity || "MEDIUM"}
            </span>
          </div>

          <h2>
            {disruption.disruption_type
              ?.replaceAll("_", " ")
              .toLowerCase()
              .replace(/\b\w/g, (char) => char.toUpperCase()) ||
              "Flight disruption"}
          </h2>

          <p>
            {disruption.description ||
              `Your flight has been delayed by ${
                disruption.delay_minutes || 0
              } minutes.`}
          </p>

          <div className="disruption-flight">
            <strong>{flight?.external_reference || "AI101"}</strong>
            <span>
              {flight?.name || "International flight"} ·{" "}
              {flight?.location || "Mumbai"} →{" "}
              {flight?.destination || "Rome"}
            </span>
          </div>
        </div>
      </div>

      <div className="disruption-times">
        <div>
          <small>ORIGINAL</small>
          <strong>{formatTime(disruption.old_start_time)}</strong>
          <span>{formatDateTime(disruption.old_start_time)}</span>
        </div>

        <div className="time-change-arrow">→</div>

        <div className="changed-time">
          <small>UPDATED</small>
          <strong>{formatTime(updatedStartTime)}</strong>
          <span>{formatDateTime(updatedStartTime)}</span>
        </div>

        <div className="delay-badge">
          +{formatDuration(disruption.delay_minutes)}
        </div>
      </div>

      <div className="impact-mini">
        <span>CASCADING IMPACT</span>
        <strong>{impact?.overall_impact || "ANALYZING"}</strong>
        <small>
          {impact?.downstream_bookings?.length || 0} downstream bookings
        </small>
      </div>
    </section>
  );
}

/* =========================================================
   STAT CARDS
========================================================= */

function StatsGrid({
  flight,
  impact,
  downstreamCount,
  plans,
  recoveryResolved,
}) {
  const stats = [
    {
      icon: "✈",
      label: "Flight",
      value: flight?.external_reference || "—",
      sub: flight?.name || "Primary flight",
      type: "blue",
    },
    {
      icon: "◉",
      label: "Impact level",
      value: impact?.overall_impact || "—",
      sub: impact?.timing_conflicts?.length
        ? `${impact.timing_conflicts.length} timing conflict`
        : "No timing conflicts",
      type:
        impact?.overall_impact === "CRITICAL"
          ? "red"
          : "orange",
    },
    {
      icon: "↗",
      label: "Affected",
      value: `${downstreamCount}`,
      sub: "downstream bookings",
      type: "purple",
    },
    {
      icon: recoveryResolved ? "✓" : "✦",
      label: "Recovery",
      value: recoveryResolved
        ? "Resolved"
        : plans.length
          ? `${plans.length} options`
          : "Analyzing",
      sub: recoveryResolved
        ? "Itinerary updated"
        : "Recovery engine",
      type: "green",
    },
  ];

  return (
    <section className="stats-grid-new">
      {stats.map((stat) => (
        <div className="stat-card-new" key={stat.label}>
          <div className={`stat-card-icon ${stat.type}`}>
            {stat.icon}
          </div>

          <div className="stat-card-content">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.sub}</small>
          </div>

          <span className="stat-card-arrow">↗</span>
        </div>
      ))}
    </section>
  );
}

/* =========================================================
   ITINERARY
========================================================= */

function ItinerarySection({
  bookings,
  targetDisruption,
  flight,
  transfer,
  hotel,
  activity,
}) {
  const items = [
    {
      booking: flight,
      label: "Flight",
      color: "blue",
    },
    {
      booking: transfer,
      label: "Transfer",
      color: "orange",
    },
    {
      booking: hotel,
      label: "Hotel",
      color: "purple",
    },
    {
      booking: activity,
      label: "Activity",
      color: "green",
    },
  ].filter((item) => item.booking);

  return (
    <section className="content-card itinerary-card">
      <div className="card-header">
        <div>
          <span className="small-label">YOUR JOURNEY</span>
          <h2>Itinerary timeline</h2>
        </div>

        <div className="card-header-right">
          <span>{bookings.length} connected bookings</span>
        </div>
      </div>

      <div className="itinerary-line" />

      <div className="itinerary-list">
        {items.map((item, index) => {
          const booking = item.booking;
          const isAffected =
            targetDisruption?.booking_id === booking.id;

          const isChanged =
            booking.status === "REPLACED" ||
            (targetDisruption?.status === "RESOLVED" &&
              index > 0);

          return (
            <div className="itinerary-item" key={booking.id}>
              <div
                className={`itinerary-node ${item.color} ${
                  isAffected ? "affected" : ""
                }`}
              >
                <span>{getBookingIcon(booking.type)}</span>
              </div>

              <div className="itinerary-info">
                <div className="itinerary-top">
                  <div>
                    <span className="itinerary-type">
                      {item.label.toUpperCase()}
                    </span>
                    <h3>{booking.name}</h3>
                  </div>

                  <span
                    className={`booking-status-pill ${getBookingStatusClass(
                      booking.status
                    )}`}
                  >
                    {booking.status || "CONFIRMED"}
                  </span>
                </div>

                <div className="itinerary-route">
                  <span>●</span>
                  {booking.location || booking.origin || "—"}
                  <span className="route-separator">→</span>
                  {booking.destination || "—"}
                </div>

                <div className="itinerary-bottom">
                  <div>
                    <small>START</small>
                    <strong>{formatDateTime(booking.start_time)}</strong>
                  </div>

                  <div>
                    <small>END</small>
                    <strong>{formatDateTime(booking.end_time)}</strong>
                  </div>

                  <div>
                    <small>REFERENCE</small>
                    <strong>{booking.external_reference || "—"}</strong>
                  </div>
                </div>

                {isAffected && targetDisruption && (
                  <div className="itinerary-warning">
                    <span>!</span>
                    Flight disruption directly affects this booking.
                  </div>
                )}

                {isChanged && !isAffected && (
                  <div className="itinerary-recovered">
                    <span>✓</span>
                    Downstream timing updated by recovery engine.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =========================================================
   JOURNEY MAP
========================================================= */

function JourneyMap({ flight, transfer, hotel }) {
  // Airport coordinates are used as the visual route anchors. The booking
  // data still controls the labels shown in the route information card.
  const mumbai = [19.0896, 72.8656];
  const rome = [41.7999, 12.2462];

  return (
    <section className="content-card journey-map-card">
      <div className="card-header">
        <div>
          <span className="small-label">JOURNEY OVERVIEW</span>
          <h2>Route map</h2>
        </div>

        <span className="map-live-pill">
          <span />
          Live itinerary
        </span>
      </div>

      <div
        className="real-map"
        style={{
          height: "330px",
          width: "100%",
          borderRadius: "18px",
          overflow: "hidden",
          position: "relative",
          zIndex: 0,
        }}
      >
        <MapContainer
          center={[30.5, 66.5]}
          zoom={3}
          minZoom={2}
          maxZoom={7}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline
            positions={[mumbai, rome]}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.85,
              dashArray: "8 8",
            }}
          />

          <CircleMarker
            center={mumbai}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent>
              Mumbai
            </Tooltip>
          </CircleMarker>

          <CircleMarker
            center={rome}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              weight: 3,
              fillColor: "#16a34a",
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent>
              Rome
            </Tooltip>
          </CircleMarker>
        </MapContainer>

        <div
          className="map-info-card"
          style={{
            position: "absolute",
            left: "14px",
            bottom: "14px",
            zIndex: 1000,
          }}
        >
          <span>ACTIVE ROUTE</span>
          <strong>
            {flight?.location || "Mumbai"} → {flight?.destination || "Rome"}
          </strong>
          <small>
            {transfer?.name || "Airport transfer"} · {hotel?.name || "Hotel"}
          </small>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   DEPENDENCY ENGINE
========================================================= */

function DependencySection({ impact, targetDisruption }) {
  const nodes = [
    {
      label: "FLIGHT",
      ref: "AI101",
      state: targetDisruption ? "affected" : "normal",
    },
    {
      label: "TRANSFER",
      ref: "REAL-TR001",
      state:
        impact?.downstream_bookings?.includes("REAL-TR001")
          ? "affected"
          : "normal",
    },
    {
      label: "HOTEL",
      ref: "REAL-HT001",
      state:
        impact?.downstream_bookings?.includes("REAL-HT001")
          ? "affected"
          : "normal",
    },
    {
      label: "ACTIVITY",
      ref: "REAL-AC001",
      state:
        impact?.downstream_bookings?.includes("REAL-AC001")
          ? "affected"
          : "normal",
    },
  ];

  return (
    <section className="content-card dependency-card">
      <div className="card-header">
        <div>
          <span className="small-label">DEPENDENCY ENGINE</span>
          <h2>Cascading impact</h2>
        </div>

        <span className="engine-status">
          <span />
          Network analyzed
        </span>
      </div>

      <div className="dependency-chain">
        {nodes.map((node, index) => (
          <div className="dependency-chain-item" key={node.ref}>
            <div
              className={`dependency-box-node ${node.state}`}
            >
              <div className="dependency-node-icon">
                {node.state === "affected" ? "!" : "✓"}
              </div>

              <div>
                <span>{node.label}</span>
                <strong>{node.ref}</strong>
              </div>
            </div>

            {index < nodes.length - 1 && (
              <div
                className={`dependency-connector ${
                  node.state === "affected" ? "active" : ""
                }`}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>

      {impact?.timing_conflicts?.length > 0 && (
        <div className="impact-conflict">
          <div className="impact-conflict-icon">!</div>
          <div>
            <strong>Timing conflict detected</strong>
            <p>{impact.timing_conflicts[0].reason}</p>
          </div>
        </div>
      )}

      <div className="impact-summary">
        <div>
          <span>OVERALL IMPACT</span>
          <strong>{impact?.overall_impact || "—"}</strong>
        </div>

        <div>
          <span>DOWNSTREAM BOOKINGS</span>
          <strong>
            {impact?.downstream_bookings?.length || 0}
          </strong>
        </div>

        <div>
          <span>BUFFER CONFLICTS</span>
          <strong>
            {impact?.missed_buffers?.length || 0}
          </strong>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   RECOVERY PLANS
========================================================= */

function RecoveryPlans({
  plans,
  selectedPlanId,
  setSelectedPlanId,
  selectedPlan,
  applying,
  applyRecoveryPlan,
  recoveryResolved,
}) {
  return (
    <section className="content-card recovery-card">
      <div className="card-header">
        <div>
          <span className="small-label">RECOVERY ENGINE</span>
          <h2>Recovery plans</h2>
        </div>

        <span className="plan-count-badge">
          {plans.length} options
        </span>
      </div>

      {recoveryResolved ? (
        <div className="recovery-completed">
          <div className="completed-icon">✓</div>
          <h3>Recovery completed</h3>
          <p>
            Your selected recovery plan has been applied and the itinerary
            has been reconstructed.
          </p>
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state-new">
          <div>✦</div>
          <strong>No recovery plans yet</strong>
          <span>
            TravelRescue will generate alternatives when an active
            disruption is detected.
          </span>
        </div>
      ) : (
        <>
          <div className="plans-container">
            {plans.map((plan, index) => {
              const selected = selectedPlanId === plan.plan_id;

              return (
                <div
                  key={plan.plan_id}
                  className={`recovery-plan ${
                    selected ? "selected" : ""
                  }`}
                  onClick={() => setSelectedPlanId(plan.plan_id)}
                >
                  <div className="recovery-plan-top">
                    <div className="plan-number">
                      0{index + 1}
                    </div>

                    <div className="plan-title">
                      <span>RECOVERY OPTION</span>
                      <h3>{plan.plan_id}</h3>
                    </div>

                    {index === 0 && (
                      <span className="recommended-badge">
                        SMART OPTION
                      </span>
                    )}
                  </div>

                  <p className="recovery-plan-description">
                    {plan.explanation}
                  </p>

                  <div className="plan-stat-row">
                    <div>
                      <small>CHANGES</small>
                      <strong>{plan.bookings_changed}</strong>
                    </div>

                    <div>
                      <small>ADDITIONAL DELAY</small>
                      <strong>
                        {plan.additional_delay_minutes || 0} min
                      </strong>
                    </div>

                    <div>
                      <small>COST CHANGE</small>
                      <strong>
                        ₹
                        {Number(
                          plan.cost_difference || 0
                        ).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  {plan.actions?.length > 0 && (
                    <div className="plan-action-list">
                      {plan.actions.map((action) => (
                        <div
                          className="plan-action-row"
                          key={action.booking_reference}
                        >
                          <span>
                            {action.booking_reference}
                          </span>

                          <strong>
                            {formatTime(
                              action.proposed_start_time
                            )}
                            {" → "}
                            {formatTime(
                              action.proposed_end_time
                            )}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    className={`plan-select-button ${
                      selected ? "selected" : ""
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedPlanId(plan.plan_id);
                    }}
                  >
                    {selected ? "✓ Selected" : "Review this plan"}
                  </button>
                </div>
              );
            })}
          </div>

          {selectedPlan && (
            <div className="apply-plan-bar">
              <div className="apply-plan-info">
                <div className="apply-check">✓</div>
                <div>
                  <strong>{selectedPlan.plan_id}</strong>
                  <span>
                    Ready to reconstruct your itinerary
                  </span>
                </div>
              </div>

              <button
                className="apply-plan-button"
                onClick={applyRecoveryPlan}
                disabled={applying}
              >
                {applying
                  ? "Applying recovery..."
                  : "Apply recovery plan →"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}


/* =========================================================
   TRIP PLANNER
========================================================= */

function parseTripDate(value) {
  const match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function tripDateToApi(value) {
  const date = parseTripDate(value);
  return date ? date.toISOString() : null;
}


function DatePickerField({ label, value, onChange }) {
  const dateInputRef = useRef(null);

  function openCalendar() {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  }

  function handleCalendarChange(event) {
    const isoDate = event.target.value;
    if (!isoDate) {
      onChange("");
      return;
    }

    const [year, month, day] = isoDate.split("-");
    onChange(`${day}/${month}/${year}`);
  }

  const calendarValue = (() => {
    const parsed = parseTripDate(value);
    if (!parsed) return "";

    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(parsed.getDate()).padStart(2, "0")}`;
  })();

  return (
    <label>
      <span className="small-label">{label}</span>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="DD/MM/YYYY"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value.replace(/[^0-9/]/g, "").slice(0, 10)
            )
          }
          style={{
            ...tripInputStyle,
            paddingRight: "54px",
          }}
        />

        <button
          type="button"
          onClick={openCalendar}
          aria-label={`Choose ${label.toLowerCase()}`}
          title="Open calendar"
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "36px",
            height: "36px",
            border: "1px solid #dbe3ef",
            borderRadius: "9px",
            background: "#f8fafc",
            color: "#2563eb",
            cursor: "pointer",
            fontSize: "17px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          📅
        </button>

        <input
          ref={dateInputRef}
          type="date"
          value={calendarValue}
          onChange={handleCalendarChange}
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </div>
      <small
        style={{
          display: "block",
          marginTop: "6px",
          color: "#64748b",
        }}
      >
        DD/MM/YYYY · click 📅 for calendar
      </small>
    </label>
  );
}


function TripsPage({ onOpenDashboard }) {
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    origin: "",
    destination: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  async function loadTrips() {
    try {
      setLoadingTrips(true);
      setError("");
      const data = await apiRequest("/trips");
      setTrips(data || []);
    } catch (err) {
      setError(err.message || "Unable to load your trips.");
    } finally {
      setLoadingTrips(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateTrip(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.origin.trim() || !form.destination.trim()) {
      setError("Please enter a trip name, origin and destination.");
      return;
    }

    if (!form.start_date || !form.end_date) {
      setError("Please enter both dates in DD/MM/YYYY format.");
      return;
    }

    const startDate = parseTripDate(form.start_date);
    const endDate = parseTripDate(form.end_date);

    if (!startDate || !endDate) {
      setError("Please enter valid dates in DD/MM/YYYY format.");
      return;
    }

    if (endDate <= startDate) {
      setError("End date must be after start date.");
      return;
    }

    try {
      setCreating(true);

      const payload = {
        name: form.name.trim(),
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        start_date: tripDateToApi(form.start_date),
        end_date: tripDateToApi(form.end_date),
        description: form.description.trim() || null,
      };

      const createdTrip = await apiRequest("/trips", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setTrips((current) => [...current, createdTrip]);
      setForm({
        name: "",
        origin: "",
        destination: "",
        start_date: "",
        end_date: "",
        description: "",
      });
      setShowForm(false);
      setSuccess(`"${createdTrip.name}" was created successfully.`);
    } catch (err) {
      setError(err.message || "Unable to create the trip.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTrip(tripId) {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;

    if (!window.confirm(`Delete "${trip.name}"?`)) return;

    try {
      setError("");
      await apiRequest(`/trips/${tripId}`, {
        method: "DELETE",
      });
      setTrips((current) => current.filter((item) => item.id !== tripId));
      setSuccess("Trip deleted successfully.");
    } catch (err) {
      setError(
        err.message ||
          "Unable to delete the trip. Make sure the TravelRescue backend is running."
      );
    }
  }

  return (
    <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
          marginBottom: "28px",
        }}
      >
        <div>
          <span className="small-label">TRAVEL PLANNER</span>
          <h1
            style={{
              margin: "8px 0 8px",
              fontSize: "34px",
              color: "#0f172a",
              lineHeight: 1.15,
            }}
          >
            My Trips
          </h1>
          <p style={{ margin: 0, color: "#64748b", maxWidth: "650px" }}>
            Create and manage your journeys. Once a trip is created, its
            bookings can become part of the TravelRescue recovery network.
          </p>
        </div>

        <button
          type="button"
          className="return-dashboard-button"
          onClick={() => setShowForm((current) => !current)}
          style={{ whiteSpace: "nowrap" }}
        >
          {showForm ? "× Close planner" : "+ Create new trip"}
        </button>
      </div>

      {success && (
        <div
          style={{
            padding: "14px 18px",
            marginBottom: "18px",
            borderRadius: "14px",
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#166534",
          }}
        >
          ✓ {success}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "14px 18px",
            marginBottom: "18px",
            borderRadius: "14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
          }}
        >
          ! {error}
        </div>
      )}

      {showForm && (
        <section
          className="content-card"
          style={{ marginBottom: "24px", padding: "28px" }}
        >
          <div className="card-header" style={{ marginBottom: "22px" }}>
            <div>
              <span className="small-label">NEW JOURNEY</span>
              <h2>Create a trip</h2>
            </div>
            <span className="plan-count-badge">Trip Planner</span>
          </div>

          <form onSubmit={handleCreateTrip}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "18px",
              }}
            >
              <label>
                <span className="small-label">TRIP NAME</span>
                <input
                  type="text"
                  placeholder="e.g. Rome Adventure"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  style={tripInputStyle}
                />
              </label>

              <label>
                <span className="small-label">DESCRIPTION</span>
                <input
                  type="text"
                  placeholder="e.g. College vacation"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  style={tripInputStyle}
                />
              </label>

              <label>
                <span className="small-label">ORIGIN</span>
                <input
                  type="text"
                  placeholder="Mumbai"
                  value={form.origin}
                  onChange={(event) =>
                    updateField("origin", event.target.value)
                  }
                  style={tripInputStyle}
                />
              </label>

              <label>
                <span className="small-label">DESTINATION</span>
                <input
                  type="text"
                  placeholder="Rome"
                  value={form.destination}
                  onChange={(event) =>
                    updateField("destination", event.target.value)
                  }
                  style={tripInputStyle}
                />
              </label>

              <DatePickerField
                label="START DATE"
                value={form.start_date}
                onChange={(value) => updateField("start_date", value)}
              />

              <DatePickerField
                label="END DATE"
                value={form.end_date}
                onChange={(value) => updateField("end_date", value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "22px",
              }}
            >
              <button
                type="button"
                className="view-all-button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="apply-plan-button"
                disabled={creating}
              >
                {creating ? "Creating trip..." : "Create trip →"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="content-card" style={{ padding: "28px" }}>
        <div className="card-header">
          <div>
            <span className="small-label">YOUR JOURNEYS</span>
            <h2 style={{ color: "#0f172a", margin: "6px 0 0", lineHeight: 1.2 }}>Trip portfolio</h2>
          </div>
          <span className="plan-count-badge">
            {trips.length} {trips.length === 1 ? "trip" : "trips"}
          </span>
        </div>

        {loadingTrips ? (
          <div className="empty-state-new">
            <div>◌</div>
            <strong>Loading your trips...</strong>
            <span>Connecting to the TravelRescue trip planner.</span>
          </div>
        ) : trips.length === 0 ? (
          <div className="empty-state-new">
            <div>✈</div>
            <strong>No trips yet</strong>
            <span>Create your first journey to start planning.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {trips
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.start_date).getTime() -
                  new Date(b.start_date).getTime()
              )
              .map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "24px",
                    padding: "22px 24px",
                    border: "1px solid #dbe4f0",
                    borderRadius: "18px",
                    background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
                  }}
                >
                  <div style={{ display: "flex", gap: "16px", minWidth: 0 }}>
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        borderRadius: "14px",
                        background: "#eff6ff",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "21px",
                        flexShrink: 0,
                      }}
                    >
                      ✈
                    </div>
                    <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: "18px" }}>{trip.name}</strong>
                      <span className="safe-pill">
                        {trip.status || "ACTIVE"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "8px",
                        color: "#0f172a",
                        fontWeight: 700,
                        fontSize: "16px",
                      }}
                    >
                      {trip.origin} <span style={{ color: "#2563eb" }}>→</span>{" "}
                      {trip.destination}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginTop: "8px",
                        color: "#64748b",
                        fontSize: "14px",
                      }}
                    >
                      <span
                        style={{
                          padding: "5px 9px",
                          borderRadius: "8px",
                          background: "#f1f5f9",
                          color: "#475569",
                          fontWeight: 600,
                        }}
                      >
                        {formatShortDate(trip.start_date)} — {formatShortDate(trip.end_date)}
                      </span>
                      {trip.description && <span>· {trip.description}</span>}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexShrink: 0,
                    }}
                  >
                    {trip.id === TRIP_ID ? (
                      <button
                        type="button"
                        className="return-dashboard-button"
                        onClick={onOpenDashboard}
                      >
                        Open journey →
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="view-all-button"
                        onClick={() =>
                          setSuccess(
                            `Trip #${trip.id} is ready for booking setup.`
                          )
                        }
                      >
                        Manage
                      </button>
                    )}

                    {trip.id !== TRIP_ID && (
                      <button
                        type="button"
                        className="view-all-button"
                        onClick={() => handleDeleteTrip(trip.id)}
                        style={{ color: "#b91c1c" }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

const tripInputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "8px",
  padding: "13px 14px",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  background: "#fff",
  color: "#0f172a",
  fontSize: "14px",
  outline: "none",
};


/* =========================================================
   AI ASSISTANT
========================================================= */

function AIAssistant({ impact, plans, disruption, recoveryResolved }) {
  const explanation = useMemo(() => {
    if (recoveryResolved) {
      return "Your recovery plan has been applied. The downstream itinerary was reconstructed while preserving the dependency relationships between your flight, transfer, hotel and activity.";
    }

    if (!disruption) {
      return "Your itinerary is currently being monitored. If a disruption is detected, I will analyze how it affects connected bookings and generate recovery options.";
    }

    if (impact?.timing_conflicts?.length) {
      return `I detected a ${disruption.delay_minutes || 0}-minute ${
        disruption.disruption_type
          ?.replaceAll("_", " ")
          .toLowerCase() || "travel"
      } disruption. It creates a timing conflict in your downstream itinerary, so the recovery engine has generated ${plans.length} alternative plan${plans.length === 1 ? "" : "s"}.`;
    }

    return "The disruption has been detected and your itinerary is being analyzed for downstream effects.";
  }, [impact, plans, disruption, recoveryResolved]);

  return (
    <section className="ai-assistant-card">
      <div className="ai-card-glow" />

      <div className="ai-card-header">
        <div className="ai-avatar">
          ✦
        </div>

        <div>
          <span className="small-label">TRAVELRESCUE INTELLIGENCE</span>
          <h2>AI Recovery Assistant</h2>
        </div>

        <span className="ai-live">
          <span />
          ACTIVE
        </span>
      </div>

      <div className="ai-message">
        <div className="ai-message-label">
          <span>TravelRescue</span>
          <small>just now</small>
        </div>

        <p>{explanation}</p>
      </div>

      <div className="ai-suggestions">
        <button>
          Why was this affected?
          <span>→</span>
        </button>

        <button>
          Explain recovery plans
          <span>→</span>
        </button>
      </div>
    </section>
  );
}

/* =========================================================
   BOOKING SUMMARY
========================================================= */

function BookingSummary({ bookings }) {
  return (
    <section className="content-card bookings-summary-card">
      <div className="card-header">
        <div>
          <span className="small-label">CONNECTED SERVICES</span>
          <h2>Bookings</h2>
        </div>

        <button className="view-all-button">View all →</button>
      </div>

      <div className="booking-summary-list">
        {bookings.map((booking) => (
          <div className="booking-summary-row" key={booking.id}>
            <div className="booking-summary-icon">
              {getBookingIcon(booking.type)}
            </div>

            <div className="booking-summary-info">
              <strong>{booking.name}</strong>
              <span>
                {getBookingLabel(booking.type)} ·{" "}
                {booking.external_reference || "No reference"}
              </span>
            </div>

            <div className="booking-summary-time">
              <strong>{formatShortDate(booking.start_time)}</strong>
              <span>{formatTime(booking.start_time)}</span>
            </div>

            <span
              className={`booking-status-pill ${getBookingStatusClass(
                booking.status
              )}`}
            >
              {booking.status || "CONFIRMED"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}


/* =========================================================
   LIVE UPDATES
========================================================= */

function LiveUpdatesPage({
  bookings,
  disruptions,
  impact,
  monitoring,
  monitorTrip,
  onOpenDashboard,
}) {
  const [lastChecked, setLastChecked] = useState(null);

  const flight =
    bookings.find(
      (booking) => booking.external_reference === "AI101"
    ) ||
    bookings.find(
      (booking) => booking.type?.toUpperCase() === "FLIGHT"
    );

  const activeDisruption =
    disruptions
      .filter((item) => item.status === "ACTIVE")
      .sort((a, b) => b.id - a.id)[0] ||
    [...disruptions].sort((a, b) => b.id - a.id)[0] ||
    null;

  const delayMinutes = Number(activeDisruption?.delay_minutes || 0);
  const updatedStartTime = getUpdatedDisruptionTime(activeDisruption);
  const downstreamCount =
    impact?.downstream_bookings?.length || 0;

  const downstreamBookings = (impact?.downstream_bookings || [])
    .map((item) => {
      const bookingId =
        typeof item === "number"
          ? item
          : item?.booking_id ?? item?.id;

      const reference =
        typeof item === "string"
          ? item
          : item?.external_reference ?? item?.reference;

      return (
        bookings.find(
          (booking) =>
            booking.id === bookingId ||
            (reference &&
              booking.external_reference === reference)
        ) || null
      );
    })
    .filter(Boolean);

  async function handleCheckNow() {
    try {
      await monitorTrip();
      setLastChecked(new Date());
    } catch {
      // monitorTrip handles user-facing errors.
    }
  }

  const recentUpdates = [
    activeDisruption && {
      id: `disruption-${activeDisruption.id}`,
      time: activeDisruption.detected_at,
      title:
        activeDisruption.disruption_type === "FLIGHT_DELAY"
          ? `${flight?.external_reference || "Flight"} delay detected`
          : `${flight?.external_reference || "Flight"} disruption detected`,
      detail: delayMinutes
        ? `Flight delayed by ${delayMinutes} minutes`
        : activeDisruption.description || "Active disruption detected",
    },
    impact &&
      downstreamCount > 0 && {
        id: "impact",
        time: activeDisruption?.detected_at,
        title: "Cascading impact identified",
        detail: `${downstreamCount} downstream booking${
          downstreamCount === 1 ? "" : "s"
        } affected`,
      },
    {
      id: "system",
      time: lastChecked,
      title: lastChecked
        ? "Live provider check completed"
        : "Live monitoring ready",
      detail: lastChecked
        ? "Flight status and disruption records refreshed"
        : "Use Check now to query the live flight provider",
    },
  ].filter(Boolean);

  return (
    <div className="page-stack">
      <section className="page-header-card">
        <div>
          <span className="small-label">LIVE MONITORING</span>
          <h1>Live Updates</h1>
          <p>
            TravelRescue continuously checks your active flight and
            turns provider changes into actionable disruption events.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="view-all-button"
            onClick={handleCheckNow}
            disabled={monitoring}
          >
            {monitoring ? "Checking..." : "↻ Check now"}
          </button>

          <button
            className="return-dashboard-button"
            onClick={onOpenDashboard}
          >
            ← Dashboard
          </button>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-main-column">
          <section className="panel-card">
            <div className="section-heading">
              <div>
                <span className="small-label">PROVIDER STATUS</span>
                <h2>Flight monitoring</h2>
              </div>

              <span
                className="status-badge"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#16a34a",
                  }}
                />
                Monitoring active
              </span>
            </div>

            {flight ? (
              <div
                style={{
                  border: "1px solid #e7ebf2",
                  borderRadius: "16px",
                  padding: "20px",
                  background: "#fbfcfe",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: "14px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        background: "#eef4ff",
                        fontSize: "20px",
                      }}
                    >
                      ✈
                    </div>

                    <div>
                      <strong style={{ fontSize: "17px" }}>
                        {flight.name || flight.external_reference}
                      </strong>
                      <div
                        style={{
                          marginTop: "5px",
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        {flight.provider || "Flight provider"} ·{" "}
                        {flight.external_reference || "No reference"}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`booking-status-pill ${
                      activeDisruption
                        ? "booking-status-warning"
                        : "booking-status-success"
                    }`}
                  >
                    {activeDisruption
                      ? `DELAYED +${delayMinutes} min`
                      : "OPERATING NORMALLY"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "12px",
                    marginTop: "22px",
                  }}
                >
                  <div>
                    <span className="metric-label">Route</span>
                    <strong>
                      {flight.location || "—"} →{" "}
                      {flight.destination || "—"}
                    </strong>
                  </div>

                  <div>
                    <span className="metric-label">Scheduled</span>
                    <strong>{formatTime(flight.start_time)}</strong>
                  </div>

                  <div>
                    <span className="metric-label">Updated</span>
                    <strong>
                      {activeDisruption
                        ? formatTime(updatedStartTime)
                        : formatTime(flight.start_time)}
                    </strong>
                  </div>

                  <div>
                    <span className="metric-label">Last checked</span>
                    <strong>
                      {lastChecked
                        ? formatTime(lastChecked)
                        : "Not checked this session"}
                    </strong>
                  </div>
                </div>

                {activeDisruption && (
                  <div
                    style={{
                      marginTop: "18px",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                    }}
                  >
                    <strong style={{ color: "#9a3412" }}>
                      ● {activeDisruption.severity || "MEDIUM"} disruption
                      detected
                    </strong>
                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#7c2d12",
                        fontSize: "13px",
                      }}
                    >
                      {activeDisruption.description ||
                        `Flight delay of ${delayMinutes} minutes detected by
                        the live monitoring service.`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No flight booking found</strong>
                <p>
                  Add a flight to this trip before starting live
                  provider monitoring.
                </p>
              </div>
            )}
          </section>

          <section className="panel-card">
            <div className="section-heading">
              <div>
                <span className="small-label">CASCADE IMPACT</span>
                <h2>Downstream bookings</h2>
              </div>
              <span className="section-count">
                {downstreamCount} affected
              </span>
            </div>

            {downstreamBookings.length > 0 ? (
              <div className="booking-summary-list">
                {downstreamBookings.map((booking) => (
                  <div
                    className="booking-summary-row"
                    key={booking.id}
                  >
                    <div className="booking-summary-icon">
                      {getBookingIcon(booking.type)}
                    </div>

                    <div className="booking-summary-info">
                      <strong>{booking.name}</strong>
                      <span>
                        {getBookingLabel(booking.type)} ·{" "}
                        {booking.external_reference || "No reference"}
                      </span>
                    </div>

                    <div className="booking-summary-time">
                      <strong>
                        {formatShortDate(booking.start_time)}
                      </strong>
                      <span>{formatTime(booking.start_time)}</span>
                    </div>

                    <span className="booking-status-pill booking-status-warning">
                      AFFECTED
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No cascading impact detected</strong>
                <p>
                  When a monitored disruption affects downstream
                  bookings, TravelRescue will show the dependency chain
                  here.
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-side-column">
          <section className="panel-card">
            <div className="section-heading">
              <div>
                <span className="small-label">RECENT ACTIVITY</span>
                <h2>Monitoring timeline</h2>
              </div>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              {recentUpdates.map((update, index) => (
                <div
                  key={update.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px 1fr",
                    gap: "10px",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        display: "block",
                        width: "9px",
                        height: "9px",
                        marginTop: "5px",
                        borderRadius: "50%",
                        background:
                          index === 0 && activeDisruption
                            ? "#f59e0b"
                            : "#3b82f6",
                      }}
                    />

                    {index < recentUpdates.length - 1 && (
                      <span
                        style={{
                          position: "absolute",
                          left: "4px",
                          top: "17px",
                          bottom: "-20px",
                          width: "1px",
                          background: "#e2e8f0",
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <strong style={{ fontSize: "13px" }}>
                      {update.title}
                    </strong>
                    <p
                      style={{
                        margin: "4px 0 3px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      {update.detail}
                    </p>
                    <span
                      style={{
                        color: "#94a3b8",
                        fontSize: "11px",
                      }}
                    >
                      {update.time
                        ? formatDateTime(update.time)
                        : "Waiting for first live check"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card">
            <span className="small-label">HOW IT WORKS</span>
            <h2 style={{ marginTop: "7px" }}>
              From signal to recovery
            </h2>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              {[
                ["01", "Provider check", "Fetch live flight status"],
                ["02", "Disruption", "Create a tracked event"],
                ["03", "Impact", "Trace dependent bookings"],
                ["04", "Recovery", "Generate recovery options"],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  style={{
                    display: "flex",
                    gap: "11px",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: "27px",
                      height: "27px",
                      borderRadius: "8px",
                      display: "grid",
                      placeItems: "center",
                      background: "#f1f5f9",
                      color: "#475569",
                      fontSize: "10px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {number}
                  </span>

                  <div>
                    <strong style={{ fontSize: "12px" }}>
                      {title}
                    </strong>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "#64748b",
                        fontSize: "11px",
                      }}
                    >
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}


/* =========================================================
   DISRUPTIONS
========================================================= */

function DisruptionsPage({
  disruptions,
  bookings,
  impact,
  refreshing,
  onRefresh,
  onOpenDashboard,
  onOpenRecovery,
}) {
  const orderedDisruptions = [...(disruptions || [])].sort(
    (a, b) => new Date(b.detected_at || 0).getTime() - new Date(a.detected_at || 0).getTime()
  );

  const activeDisruptions = orderedDisruptions.filter(
    (item) => item.status === "ACTIVE"
  );

  const resolvedDisruptions = orderedDisruptions.filter(
    (item) => item.status !== "ACTIVE"
  );

  const [selectedId, setSelectedId] = useState(
    activeDisruptions[0]?.id || orderedDisruptions[0]?.id || null
  );

  useEffect(() => {
    const availableIds = orderedDisruptions.map((item) => item.id);

    if (!availableIds.includes(selectedId)) {
      setSelectedId(
        activeDisruptions[0]?.id || orderedDisruptions[0]?.id || null
      );
    }
  }, [disruptions, selectedId]);

  const selectedDisruption =
    orderedDisruptions.find((item) => item.id === selectedId) ||
    orderedDisruptions[0] ||
    null;

  const selectedBooking = selectedDisruption
    ? bookings.find((booking) => booking.id === selectedDisruption.booking_id)
    : null;

  const selectedImpact =
    selectedDisruption &&
    activeDisruptions.some((item) => item.id === selectedDisruption.id)
      ? impact
      : null;

  const downstreamBookings = (selectedImpact?.downstream_bookings || [])
    .map((item) => {
      const bookingId =
        typeof item === "number"
          ? item
          : item?.booking_id ?? item?.id;

      const reference =
        typeof item === "string"
          ? item
          : item?.external_reference ?? item?.reference;

      return (
        bookings.find(
          (booking) =>
            booking.id === bookingId ||
            (reference &&
              booking.external_reference === reference)
        ) || null
      );
    })
    .filter(Boolean);

  const activeCount = activeDisruptions.length;
  const criticalCount = activeDisruptions.filter(
    (item) => item.severity === "CRITICAL"
  ).length;
  const affectedCount = selectedImpact?.downstream_bookings?.length || 0;

  function disruptionLabel(type) {
    return (
      type
        ?.replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase()) ||
      "Travel disruption"
    );
  }

  function severityStyle(severity) {
    const value = String(severity || "MEDIUM").toUpperCase();

    if (value === "CRITICAL") {
      return {
        background: "#fef2f2",
        color: "#b91c1c",
        border: "1px solid #fecaca",
      };
    }

    if (value === "HIGH") {
      return {
        background: "#fff7ed",
        color: "#c2410c",
        border: "1px solid #fed7aa",
      };
    }

    if (value === "LOW") {
      return {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      background: "#fffbeb",
      color: "#a16207",
      border: "1px solid #fde68a",
    };
  }

  return (
    <div className="page-stack">
      <section className="page-header-card">
        <div>
          <span className="small-label">DISRUPTION CENTER</span>
          <h1>Disruptions</h1>
          <p>
            Review detected travel disruptions, understand their cascading
            impact, and move directly into recovery planning.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="view-all-button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            className="return-dashboard-button"
            onClick={onOpenDashboard}
          >
            ← Dashboard
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "14px",
        }}
      >
        <div className="stat-card-new">
          <div className="stat-card-icon orange">!</div>
          <div className="stat-card-content">
            <span>ACTIVE DISRUPTIONS</span>
            <strong>{activeCount}</strong>
            <small>currently being tracked</small>
          </div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-icon red">⚠</div>
          <div className="stat-card-content">
            <span>CRITICAL EVENTS</span>
            <strong>{criticalCount}</strong>
            <small>requiring urgent attention</small>
          </div>
        </div>

        <div className="stat-card-new">
          <div className="stat-card-icon purple">↗</div>
          <div className="stat-card-content">
            <span>RECORDED EVENTS</span>
            <strong>{orderedDisruptions.length}</strong>
            <small>active and resolved</small>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 0.82fr) minmax(0, 1.6fr)",
          gap: "18px",
          alignItems: "start",
        }}
      >
        <section className="content-card" style={{ padding: "22px" }}>
          <div className="card-header" style={{ marginBottom: "16px" }}>
            <div>
              <span className="small-label">EVENT LOG</span>
              <h2>Detected disruptions</h2>
            </div>

            <span className="plan-count-badge">
              {orderedDisruptions.length}
            </span>
          </div>

          {orderedDisruptions.length === 0 ? (
            <div className="empty-state-new">
              <div>✓</div>
              <strong>No disruptions detected</strong>
              <span>
                Your connected itinerary currently has no recorded disruption
                events.
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {orderedDisruptions.map((item) => {
                const selected = item.id === selectedDisruption?.id;
                const active = item.status === "ACTIVE";

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: selected
                        ? "1px solid #93c5fd"
                        : "1px solid #e2e8f0",
                      background: selected ? "#eff6ff" : "#ffffff",
                      borderRadius: "14px",
                      padding: "15px",
                      cursor: "pointer",
                      boxShadow: selected
                        ? "0 8px 22px rgba(37, 99, 235, 0.10)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            color: "#0f172a",
                            fontSize: "15px",
                          }}
                        >
                          {disruptionLabel(item.disruption_type)}
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "#64748b",
                            fontSize: "12px",
                          }}
                        >
                          {item.booking_id
                            ? `Booking #${item.booking_id}`
                            : "Trip disruption"}
                        </span>
                      </div>

                      <span
                        style={{
                          ...severityStyle(item.severity),
                          borderRadius: "999px",
                          padding: "5px 8px",
                          fontSize: "10px",
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {item.severity || "MEDIUM"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginTop: "13px",
                        color: "#64748b",
                        fontSize: "12px",
                      }}
                    >
                      <span>{formatShortDate(item.detected_at)}</span>

                      <span
                        style={{
                          color: active ? "#b45309" : "#15803d",
                          fontWeight: 700,
                        }}
                      >
                        {active ? "● ACTIVE" : "✓ RESOLVED"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="content-card" style={{ padding: "26px" }}>
          {selectedDisruption ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "18px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <span className="small-label">
                    {selectedDisruption.status === "ACTIVE"
                      ? "ACTIVE INCIDENT"
                      : "RESOLVED INCIDENT"}
                  </span>

                  <h2 style={{ marginTop: "7px" }}>
                    {disruptionLabel(selectedDisruption.disruption_type)}
                  </h2>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedDisruption.description ||
                      "A disruption was detected in your travel itinerary."}
                  </p>
                </div>

                <span
                  style={{
                    ...severityStyle(selectedDisruption.severity),
                    borderRadius: "999px",
                    padding: "8px 12px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {selectedDisruption.severity || "MEDIUM"} SEVERITY
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                  marginTop: "24px",
                }}
              >
                <div
                  style={{
                    padding: "15px",
                    borderRadius: "14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span className="metric-label">BOOKING</span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "#0f172a",
                    }}
                  >
                    {selectedBooking?.external_reference ||
                      `#${selectedDisruption.booking_id}`}
                  </strong>
                  <small style={{ color: "#64748b" }}>
                    {selectedBooking?.name || "Affected booking"}
                  </small>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span className="metric-label">DELAY</span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "#0f172a",
                    }}
                  >
                    {selectedDisruption.delay_minutes
                      ? `+${selectedDisruption.delay_minutes} min`
                      : "—"}
                  </strong>
                  <small style={{ color: "#64748b" }}>
                    {selectedDisruption.status === "ACTIVE"
                      ? "current disruption"
                      : "recorded duration"}
                  </small>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <span className="metric-label">DETECTED</span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "6px",
                      color: "#0f172a",
                    }}
                  >
                    {formatTime(selectedDisruption.detected_at)}
                  </strong>
                  <small style={{ color: "#64748b" }}>
                    {formatShortDate(selectedDisruption.detected_at)}
                  </small>
                </div>
              </div>

              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  borderRadius: "16px",
                  background:
                    selectedDisruption.status === "ACTIVE"
                      ? "linear-gradient(135deg, #fff7ed 0%, #fffbeb 100%)"
                      : "#f0fdf4",
                  border:
                    selectedDisruption.status === "ACTIVE"
                      ? "1px solid #fed7aa"
                      : "1px solid #bbf7d0",
                }}
              >
                <div className="small-label">TIMELINE CHANGE</div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "18px",
                    marginTop: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <small style={{ color: "#64748b" }}>ORIGINAL</small>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "4px",
                        fontSize: "20px",
                        color: "#0f172a",
                      }}
                    >
                      {formatTime(selectedDisruption.old_start_time)}
                    </strong>
                  </div>

                  <span style={{ fontSize: "22px", color: "#94a3b8" }}>
                    →
                  </span>

                  <div>
                    <small style={{ color: "#64748b" }}>UPDATED</small>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "4px",
                        fontSize: "20px",
                        color: "#c2410c",
                      }}
                    >
                      {formatTime(getUpdatedDisruptionTime(selectedDisruption))}
                    </strong>
                  </div>

                  <span
                    style={{
                      marginLeft: "auto",
                      padding: "8px 11px",
                      borderRadius: "10px",
                      background: "#ffffff",
                      border: "1px solid #fed7aa",
                      color: "#b45309",
                      fontWeight: 800,
                      fontSize: "12px",
                    }}
                  >
                    {selectedDisruption.delay_minutes
                      ? `+${selectedDisruption.delay_minutes} min`
                      : "Schedule changed"}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "22px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <span className="small-label">CASCADE ANALYSIS</span>
                    <h3 style={{ margin: "5px 0 0" }}>
                      Downstream impact
                    </h3>
                  </div>

                  <strong
                    style={{
                      fontSize: "24px",
                      color: affectedCount ? "#c2410c" : "#15803d",
                    }}
                  >
                    {affectedCount}
                  </strong>
                </div>

                {downstreamBookings.length > 0 ? (
                  <div style={{ display: "grid", gap: "9px" }}>
                    {downstreamBookings.map((booking) => (
                      <div
                        key={booking.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "14px",
                          padding: "13px 15px",
                          borderRadius: "12px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            minWidth: 0,
                          }}
                        >
                          <span style={{ fontSize: "18px" }}>
                            {getBookingIcon(booking.type)}
                          </span>

                          <div style={{ minWidth: 0 }}>
                            <strong
                              style={{
                                display: "block",
                                color: "#0f172a",
                                fontSize: "13px",
                              }}
                            >
                              {booking.name}
                            </strong>

                            <small style={{ color: "#64748b" }}>
                              {booking.external_reference || "Connected booking"}
                            </small>
                          </div>
                        </div>

                        <span
                          style={{
                            color: "#b45309",
                            fontWeight: 800,
                            fontSize: "10px",
                            flexShrink: 0,
                          }}
                        >
                          AFFECTED
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      color: "#166534",
                    }}
                  >
                    No downstream booking conflicts are currently associated
                    with this disruption.
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "14px",
                  marginTop: "24px",
                  paddingTop: "20px",
                  borderTop: "1px solid #e2e8f0",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <small style={{ color: "#64748b" }}>DETECTED AT</small>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#0f172a",
                    }}
                  >
                    {formatDateTime(selectedDisruption.detected_at)}
                  </strong>
                </div>

                {selectedDisruption.status === "ACTIVE" && (
                  <button
                    className="apply-plan-button"
                    onClick={onOpenRecovery}
                  >
                    View recovery plans →
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state-new" style={{ minHeight: "420px" }}>
              <div>✓</div>
              <strong>Journey is clear</strong>
              <span>
                There are no disruption records to investigate.
              </span>
            </div>
          )}
        </section>
      </section>

      {resolvedDisruptions.length > 0 && (
        <section className="content-card" style={{ padding: "24px" }}>
          <div className="card-header">
            <div>
              <span className="small-label">HISTORY</span>
              <h2>Resolved disruptions</h2>
            </div>

            <span className="plan-count-badge">
              {resolvedDisruptions.length}
            </span>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {resolvedDisruptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  alignItems: "center",
                  gap: "18px",
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div>
                  <strong style={{ color: "#0f172a" }}>
                    {disruptionLabel(item.disruption_type)}
                  </strong>
                  <small
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#64748b",
                    }}
                  >
                    {item.description || "Recorded travel disruption"}
                  </small>
                </div>

                <span style={{ color: "#64748b", fontSize: "12px" }}>
                  {formatDateTime(item.detected_at)}
                </span>

                <span
                  style={{
                    color: "#15803d",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  ✓ RESOLVED
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({ auth, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [disruptions, setDisruptions] = useState([]);
  const [impact, setImpact] = useState(null);
  const [plans, setPlans] = useState([]);

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [applying, setApplying] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadDashboard(showRefresh = false) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [bookingData, disruptionData] = await Promise.all([
        apiRequest(`/trips/${TRIP_ID}/bookings`),
        apiRequest(`/trips/${TRIP_ID}/disruptions`),
      ]);

      const nextBookings = bookingData || [];
      const nextDisruptions = disruptionData || [];

      setBookings(nextBookings);
      setDisruptions(nextDisruptions);

      const activeDisruptions = nextDisruptions
        .filter((item) => item.status === "ACTIVE")
        .sort((a, b) => b.id - a.id);

      const targetDisruption =
        activeDisruptions[0] ||
        [...nextDisruptions].sort((a, b) => b.id - a.id)[0];

      if (!targetDisruption) {
        setImpact(null);
        setPlans([]);
        setSelectedPlanId(null);
        return;
      }

      const impactRequest = apiRequest(
        `/trips/${TRIP_ID}/impact/${targetDisruption.id}`
      );

      const recoveryRequest =
        targetDisruption.status === "ACTIVE"
          ? apiRequest(
              `/trips/${TRIP_ID}/recovery/${targetDisruption.id}/plans`
            )
          : Promise.resolve([]);

      const [impactData, recoveryPlans] = await Promise.all([
        impactRequest,
        recoveryRequest,
      ]);

      setImpact(impactData);
      setPlans(recoveryPlans || []);

      setSelectedPlanId((current) => {
        if (
          current &&
          (recoveryPlans || []).some(
            (plan) => plan.plan_id === current
          )
        ) {
          return current;
        }

        return null;
      });
    } catch (err) {
      console.error(err);

      if (err.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        onLogout();
        return;
      }

      setError(err.message || "Unable to load TravelRescue data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const targetDisruption =
    disruptions
      .filter((item) => item.status === "ACTIVE")
      .sort((a, b) => b.id - a.id)[0] ||
    [...disruptions].sort((a, b) => b.id - a.id)[0] ||
    null;

  const flight =
    bookings.find(
      (booking) => booking.external_reference === "AI101"
    ) ||
    bookings.find(
      (booking) => booking.type?.toUpperCase() === "FLIGHT"
    );

  const transfer = bookings.find(
    (booking) => booking.external_reference === "REAL-TR001"
  );

  const hotel = bookings.find(
    (booking) => booking.external_reference === "REAL-HT001"
  );

  const activity = bookings.find(
    (booking) => booking.external_reference === "REAL-AC001"
  );

  const downstreamCount =
    impact?.downstream_bookings?.length || 0;

  const recoveryResolved =
    targetDisruption?.status === "RESOLVED";

  const selectedPlan =
    plans.find((plan) => plan.plan_id === selectedPlanId) || null;

  async function simulateDisruption() {
    if (!flight) return;

    try {
      setSimulating(true);
      setError("");
      setSuccessMessage("");

      const result = await apiRequest(
        `/trips/${TRIP_ID}/disruptions/test`,
        {
          method: "POST",
          body: JSON.stringify({
            booking_id: flight.id,
            delay_minutes: 90,
            severity: "HIGH",
            description:
              "Demo disruption: AI101 has been delayed by 90 minutes.",
          }),
        }
      );

      setSuccessMessage(
        `Disruption #${result.id} detected. TravelRescue is calculating the cascading impact.`
      );

      await loadDashboard(true);
    } catch (err) {
      console.error(err);

      if (err.status === 409) {
        setError(
          "An active disruption already exists for this flight. Resolve it before creating another demo disruption."
        );
      } else if (err.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        onLogout();
      } else {
        setError(
          err.message || "Unable to simulate the disruption."
        );
      }
    } finally {
      setSimulating(false);
    }
  }

  async function monitorTrip() {
    try {
      setMonitoring(true);
      setError("");
      setSuccessMessage("");

      const result = await apiRequest(
        `/trips/${TRIP_ID}/monitor`,
        { method: "POST" }
      );

      const disruptedResult = (result?.results || []).find(
        (item) => item.disrupted
      );

      if (result?.new_disruptions > 0 && disruptedResult) {
        setSuccessMessage(
          `${disruptedResult.flight_number}: ${
            disruptedResult.delay_minutes || 0
          }-minute ${
            disruptedResult.disruption_type === "FLIGHT_DELAY"
              ? "delay"
              : "disruption"
          } detected. Impact analysis has been refreshed.`
        );
      } else if (disruptedResult) {
        setSuccessMessage(
          `${disruptedResult.flight_number}: current provider status shows a ${
            disruptedResult.delay_minutes || 0
          }-minute delay. The existing disruption is already being tracked.`
        );
      } else if (result?.checked_bookings > 0) {
        setSuccessMessage(
          "Live flight check completed. All monitored flights are currently operating normally."
        );
      } else {
        setSuccessMessage(
          "Live flight check completed. No flight bookings were available to monitor."
        );
      }

      await loadDashboard(true);
    } catch (err) {
      console.error(err);

      if (err.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        onLogout();
        return;
      }

      setError(
        err.message || "Unable to check live flight status."
      );
    } finally {
      setMonitoring(false);
    }
  }

  async function applyRecoveryPlan() {
    if (!targetDisruption || !selectedPlan) return;

    try {
      setApplying(true);
      setError("");
      setSuccessMessage("");

      await apiRequest(
        `/trips/${TRIP_ID}/recovery/${targetDisruption.id}/apply`,
        {
          method: "POST",
          body: JSON.stringify({
            plan_id: selectedPlan.plan_id,
          }),
        }
      );

      setSuccessMessage(
        `${selectedPlan.plan_id} has been applied successfully. Your itinerary has been reconstructed.`
      );

      setSelectedPlanId(null);

      await loadDashboard(true);
    } catch (err) {
      console.error(err);

      if (err.status === 401) {
        sessionStorage.removeItem(STORAGE_KEY);
        onLogout();
        return;
      }

      setError(
        err.message || "Unable to apply the recovery plan."
      );
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-logo">TR</div>
        <div className="loading-spinner" />
        <h2>Preparing your journey</h2>
        <p>Connecting to TravelRescue...</p>
      </div>
    );
  }

  return (
    <div className="product-shell">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={auth?.user}
        onLogout={onLogout}
      />

      <div className="main-area">
        <Topbar
          onRefresh={() => loadDashboard(true)}
          refreshing={refreshing}
          onMonitor={monitorTrip}
          monitoring={monitoring}
          user={auth?.user}
        />

        <main className="product-content">
          {successMessage && (
            <div className="toast success-toast">
              <span>✓</span>
              <div>
                <strong>TravelRescue update</strong>
                <p>{successMessage}</p>
              </div>
              <button onClick={() => setSuccessMessage("")}>×</button>
            </div>
          )}

          {error && (
            <div className="toast error-toast">
              <span>!</span>
              <div>
                <strong>Something went wrong</strong>
                <p>{error}</p>
              </div>
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          {activePage === "trips" && (
            <TripsPage onOpenDashboard={() => setActivePage("dashboard")} />
          )}

          {activePage === "live" && (
            <LiveUpdatesPage
              bookings={bookings}
              disruptions={disruptions}
              impact={impact}
              monitoring={monitoring}
              monitorTrip={monitorTrip}
              onOpenDashboard={() => setActivePage("dashboard")}
            />
          )}

          {activePage === "disruptions" && (
            <DisruptionsPage
              disruptions={disruptions}
              bookings={bookings}
              impact={impact}
              refreshing={refreshing}
              onRefresh={() => loadDashboard(true)}
              onOpenDashboard={() => setActivePage("dashboard")}
              onOpenRecovery={() => setActivePage("recovery")}
            />
          )}

          {activePage === "recovery" && (
            <div>
              <WorkspaceHeader
                label="RECOVERY WORKSPACE"
                title="Recovery Plans"
                description="Review dependency-aware alternatives, compare their effects, and apply a recovery plan to reconstruct the itinerary."
                onBack={() => setActivePage("dashboard")}
              />

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.65fr)", gap: 20, alignItems: "start" }}>
                <RecoveryPlans
                  plans={plans}
                  selectedPlanId={selectedPlanId}
                  setSelectedPlanId={setSelectedPlanId}
                  selectedPlan={selectedPlan}
                  applying={applying}
                  applyRecoveryPlan={applyRecoveryPlan}
                  recoveryResolved={recoveryResolved}
                />

                <div style={{ display: "grid", gap: 18 }}>
                  <DisruptionCard
                    disruption={targetDisruption}
                    flight={flight}
                    impact={impact}
                  />
                  <AIAssistant
                    impact={impact}
                    plans={plans}
                    disruption={targetDisruption}
                    recoveryResolved={recoveryResolved}
                  />
                </div>
              </div>

              <div style={{ marginTop: 20 }}>
                <ItinerarySection
                  bookings={bookings}
                  targetDisruption={targetDisruption}
                  flight={flight}
                  transfer={transfer}
                  hotel={hotel}
                  activity={activity}
                />
              </div>
            </div>
          )}

          {activePage === "bookings" && (
            <div>
              <WorkspaceHeader
                label="CONNECTED SERVICES"
                title="Bookings"
                description="View every booking in the active itinerary, its current status, timing, and relationship to other journey components."
                onBack={() => setActivePage("dashboard")}
              />

              <BookingSummary bookings={bookings} />

              <div style={{ marginTop: 20 }} className="content-card">
                <div className="card-header">
                  <div>
                    <span className="small-label">DEPENDENCY MAP</span>
                    <h2>Booking relationships</h2>
                  </div>
                  <span className="plan-count-badge">{bookings.length} connected</span>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {bookings.map((booking) => (
                    <div key={booking.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 15, padding: "14px 16px", border: "1px solid #e9edf4", borderRadius: 12 }}>
                      <div>
                        <strong>{booking.external_reference || `BOOKING-${booking.id}`}</strong>
                        <span style={{ display: "block", color: "#718096", fontSize: 13, marginTop: 4 }}>{booking.name}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className={`booking-status-pill ${getBookingStatusClass(booking.status)}`}>{booking.status || "CONFIRMED"}</span>
                        <span style={{ display: "block", color: "#718096", fontSize: 12, marginTop: 5 }}>{getBookingLabel(booking.type)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activePage === "assistant" && (
            <div>
              <WorkspaceHeader
                label="TRAVELRESCUE INTELLIGENCE"
                title="AI Assistant"
                description="Understand the disruption, its downstream impact, and the recovery options generated from your active itinerary."
                onBack={() => setActivePage("dashboard")}
              />

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(300px, 0.8fr)", gap: 20, alignItems: "start" }}>
                <AIAssistant
                  impact={impact}
                  plans={plans}
                  disruption={targetDisruption}
                  recoveryResolved={recoveryResolved}
                />

                <div style={{ display: "grid", gap: 18 }}>
                  <section className="content-card">
                    <div className="card-header">
                      <div>
                        <span className="small-label">CURRENT CONTEXT</span>
                        <h2>Trip intelligence</h2>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ padding: 14, borderRadius: 12, background: "#f7f9fc" }}>
                        <small className="small-label">DISRUPTION</small>
                        <strong style={{ display: "block", marginTop: 5 }}>{targetDisruption ? String(targetDisruption.disruption_type || "Travel disruption").replaceAll("_", " ") : "No active disruption"}</strong>
                      </div>
                      <div style={{ padding: 14, borderRadius: 12, background: "#f7f9fc" }}>
                        <small className="small-label">DOWNSTREAM IMPACT</small>
                        <strong style={{ display: "block", marginTop: 5 }}>{downstreamCount} booking{downstreamCount === 1 ? "" : "s"} affected</strong>
                      </div>
                      <div style={{ padding: 14, borderRadius: 12, background: "#f7f9fc" }}>
                        <small className="small-label">RECOVERY OPTIONS</small>
                        <strong style={{ display: "block", marginTop: 5 }}>{plans.length} plan{plans.length === 1 ? "" : "s"} available</strong>
                      </div>
                    </div>
                  </section>

                  <section className="content-card">
                    <span className="small-label">NEXT ACTION</span>
                    <h2 style={{ marginTop: 8 }}>Review recovery plans</h2>
                    <p style={{ color: "#718096", lineHeight: 1.6 }}>Compare the generated alternatives before applying a plan to the itinerary.</p>
                    <button className="return-dashboard-button" onClick={() => setActivePage("recovery")}>
                      Open recovery workspace →
                    </button>
                  </section>
                </div>
              </div>
            </div>
          )}

          {activePage === "settings" && (
            <SettingsPage
              user={auth?.user}
              onLogout={onLogout}
              onOpenDashboard={() => setActivePage("dashboard")}
            />
          )}

          {activePage === "dashboard" && (
            <>
              <TripHero
                bookings={bookings}
                flight={flight}
                targetDisruption={targetDisruption}
                onSimulate={simulateDisruption}
                simulating={simulating}
                applying={applying}
              />

              <DisruptionCard
                disruption={targetDisruption}
                flight={flight}
                impact={impact}
              />

              <StatsGrid
                flight={flight}
                impact={impact}
                downstreamCount={downstreamCount}
                plans={plans}
                recoveryResolved={recoveryResolved}
              />

              <div className="dashboard-grid">
                <div className="dashboard-main-column">
                  <ItinerarySection
                    bookings={bookings}
                    targetDisruption={targetDisruption}
                    flight={flight}
                    transfer={transfer}
                    hotel={hotel}
                    activity={activity}
                  />

                  <DependencySection
                    impact={impact}
                    targetDisruption={targetDisruption}
                  />

                  <BookingSummary bookings={bookings} />
                </div>

                <div className="dashboard-side-column">
                  <JourneyMap
                    flight={flight}
                    transfer={transfer}
                    hotel={hotel}
                  />

                  <RecoveryPlans
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    setSelectedPlanId={setSelectedPlanId}
                    selectedPlan={selectedPlan}
                    applying={applying}
                    applyRecoveryPlan={applyRecoveryPlan}
                    recoveryResolved={recoveryResolved}
                  />

                  <AIAssistant
                    impact={impact}
                    plans={plans}
                    disruption={targetDisruption}
                    recoveryResolved={recoveryResolved}
                  />
                </div>
              </div>

              <footer className="product-footer">
                <div>
                  <strong>TravelRescue</strong>
                  <span>Intelligent Travel Recovery Platform</span>
                </div>

                <div>
                  <span>Trip #{TRIP_ID}</span>
                  <span>•</span>
                  <span>
                    Signed in as {auth?.user?.name || "Traveler"}
                  </span>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}



/* =========================================================
   SETTINGS PAGE
========================================================= */

function SettingsPage({ user, onLogout, onOpenDashboard }) {
  const [notifications, setNotifications] = useState(true);
  const [liveMonitoring, setLiveMonitoring] = useState(true);
  const [recoveryAlerts, setRecoveryAlerts] = useState(true);

  return (
    <div className="page-placeholder" style={{ minHeight: "calc(100vh - 190px)" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto", width: "100%" }}>
        <span className="small-label">ACCOUNT & PREFERENCES</span>
        <h1 style={{ marginBottom: 8 }}>Settings</h1>
        <p style={{ marginBottom: 28 }}>
          Manage your TravelRescue profile, monitoring preferences and recovery notifications.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, textAlign: "left" }}>
          <section className="content-card">
            <div className="card-header">
              <div>
                <span className="small-label">PROFILE</span>
                <h2>Traveler account</h2>
              </div>
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              <div><small className="small-label">NAME</small><strong style={{ display: "block", marginTop: 5 }}>{user?.name || "Traveler"}</strong></div>
              <div><small className="small-label">EMAIL</small><strong style={{ display: "block", marginTop: 5 }}>{user?.email || "Not available"}</strong></div>
              <div><small className="small-label">ROLE</small><strong style={{ display: "block", marginTop: 5 }}>{user?.role || "CUSTOMER"}</strong></div>
            </div>
          </section>

          <section className="content-card">
            <div className="card-header">
              <div>
                <span className="small-label">TRAVELRESCUE</span>
                <h2>Monitoring</h2>
              </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                ["Live flight monitoring", liveMonitoring, setLiveMonitoring, "Check provider status for monitored flights."],
                ["Disruption alerts", notifications, setNotifications, "Show important changes detected on your trip."],
                ["Recovery plan alerts", recoveryAlerts, setRecoveryAlerts, "Notify when new recovery options are available."],
              ].map(([label, value, setter, description]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid #edf1f7" }}>
                  <div>
                    <strong style={{ display: "block" }}>{label}</strong>
                    <span style={{ display: "block", marginTop: 4, color: "#718096", fontSize: 13 }}>{description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setter(!value)}
                    aria-pressed={value}
                    style={{
                      minWidth: 58,
                      height: 32,
                      border: 0,
                      borderRadius: 18,
                      padding: 3,
                      cursor: "pointer",
                      background: value ? "#2563eb" : "#cbd5e1",
                      transition: "0.2s",
                    }}
                  >
                    <span style={{ display: "block", width: 26, height: 26, borderRadius: "50%", background: "white", transform: value ? "translateX(26px)" : "translateX(0)", transition: "0.2s" }} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="content-card">
            <div className="card-header">
              <div>
                <span className="small-label">CURRENT TRIP</span>
                <h2>Trip configuration</h2>
              </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 12, background: "#f7f9fc" }}>
                <small className="small-label">ACTIVE TRIP</small>
                <strong style={{ display: "block", marginTop: 5 }}>Rome Journey</strong>
                <span style={{ color: "#718096", fontSize: 13 }}>DEL → FCO · Trip #{TRIP_ID}</span>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: "#f7f9fc" }}>
                <small className="small-label">RECOVERY MODE</small>
                <strong style={{ display: "block", marginTop: 5 }}>AI-assisted recovery</strong>
                <span style={{ color: "#718096", fontSize: 13 }}>Dependency-aware alternatives are generated from the active itinerary.</span>
              </div>
            </div>
          </section>

          <section className="content-card">
            <div className="card-header">
              <div>
                <span className="small-label">SESSION</span>
                <h2>Account actions</h2>
              </div>
            </div>
            <p style={{ color: "#718096", lineHeight: 1.6 }}>
              Your current session is active. You can return to the dashboard or sign out of TravelRescue from here.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <button className="return-dashboard-button" onClick={onOpenDashboard}>
                ← Dashboard
              </button>
              <button
                type="button"
                onClick={onLogout}
                style={{ border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", borderRadius: 10, padding: "11px 16px", fontWeight: 700, cursor: "pointer" }}
              >
                Sign out
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   WORKSPACE PAGE HELPERS
========================================================= */

function WorkspaceHeader({ label, title, description, onBack }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <span className="small-label">{label}</span>
      <h1 style={{ margin: "8px 0 8px" }}>{title}</h1>
      <p style={{ margin: 0, color: "#667085", lineHeight: 1.6 }}>{description}</p>
      <button className="return-dashboard-button" style={{ marginTop: 18 }} onClick={onBack}>
        ← Back to dashboard
      </button>
    </div>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [auth, setAuth] = useState(getStoredAuth);

  function handleLogin(authData) {
    setAuth(authData);
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }

  if (!auth?.access_token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      auth={auth}
      onLogout={handleLogout}
    />
  );
}

export default App;

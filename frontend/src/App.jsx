import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";
const TRIP_ID = 1;
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      let result = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.detail ||
            result?.message ||
            `Login failed: ${response.status}`
        );
      }

      const authData = {
        access_token: result.access_token,
        token_type: result.token_type,
        user: result.user,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      onLogin(authData);
    } catch (err) {
      setError(err.message || "Unable to login.");
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
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
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
        localStorage.removeItem(STORAGE_KEY);
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
        localStorage.removeItem(STORAGE_KEY);
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
        localStorage.removeItem(STORAGE_KEY);
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
        localStorage.removeItem(STORAGE_KEY);
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

          {activePage !== "dashboard" && (
            <div className="page-placeholder">
              <span className="small-label">TRAVELRESCUE</span>
              <h1>
                {activePage === "trips" && "My Trips"}
                {activePage === "live" && "Live Updates"}
                {activePage === "disruptions" && "Disruptions"}
                {activePage === "recovery" && "Recovery Plans"}
                {activePage === "bookings" && "Bookings"}
                {activePage === "assistant" && "AI Assistant"}
                {activePage === "settings" && "Settings"}
              </h1>
              <p>
                This section is part of the TravelRescue product
                architecture. The active dashboard contains the working
                trip monitoring and recovery workflow.
              </p>

              <button
                className="return-dashboard-button"
                onClick={() => setActivePage("dashboard")}
              >
                ← Back to dashboard
              </button>
            </div>
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
   APP
========================================================= */

function App() {
  const [auth, setAuth] = useState(getStoredAuth);

  function handleLogin(authData) {
    setAuth(authData);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
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
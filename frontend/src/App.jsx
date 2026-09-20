import { useEffect, useMemo, useRef, useState } from "react";
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
   RECOVERY PLANS PAGE
========================================================= */

function RecoveryPlansPage({
  plans,
  selectedPlanId,
  setSelectedPlanId,
  selectedPlan,
  applying,
  applyRecoveryPlan,
  recoveryResolved,
  disruption,
  impact,
  onOpenDashboard,
}) {
  const affectedCount = impact?.downstream_bookings?.length || 0;
  const conflictCount = impact?.missed_buffers?.length || 0;

  return (
    <div className="recovery-page">
      <div className="recovery-page-header">
        <div>
          <span className="small-label">TRAVELRESCUE INTELLIGENCE</span>
          <h1>Recovery Plans</h1>
          <p>
            Review AI-generated alternatives for the active travel disruption,
            compare their impact, and apply the plan that fits your journey.
          </p>
        </div>

        <button
          className="return-dashboard-button"
          onClick={onOpenDashboard}
        >
          ← Back to dashboard
        </button>
      </div>

      {disruption ? (
        <section className="content-card recovery-overview-card">
          <div className="card-header">
            <div>
              <span className="small-label">ACTIVE DISRUPTION</span>
              <h2>
                {disruption.disruption_type
                  ?.replaceAll("_", " ")
                  .replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
                  "Travel disruption"}
              </h2>
            </div>

            <span
              className={`severity-badge ${
                String(disruption.severity || "").toLowerCase()
              }`}
            >
              {disruption.severity || "UNKNOWN"}
            </span>
          </div>

          <div className="recovery-overview-grid">
            <div>
              <span>BOOKING</span>
              <strong>{disruption.booking_id ? `#${disruption.booking_id}` : "—"}</strong>
            </div>

            <div>
              <span>DELAY</span>
              <strong>{disruption.delay_minutes || 0} min</strong>
            </div>

            <div>
              <span>DOWNSTREAM</span>
              <strong>{affectedCount} bookings</strong>
            </div>

            <div>
              <span>BUFFER CONFLICTS</span>
              <strong>{conflictCount}</strong>
            </div>
          </div>

          <div className="recovery-disruption-message">
            <div className="recovery-disruption-icon">!</div>
            <div>
              <strong>
                {disruption.description ||
                  "TravelRescue detected a disruption affecting your itinerary."}
              </strong>
              <span>
                The recovery engine has evaluated the connected booking
                network and generated alternative plans below.
              </span>
            </div>
          </div>
        </section>
      ) : (
        <section className="content-card recovery-no-disruption">
          <div className="completed-icon">✓</div>
          <div>
            <h2>No active disruption</h2>
            <p>
              Your itinerary is currently being monitored. Recovery plans
              will appear automatically when a disruption creates a
              downstream conflict.
            </p>
          </div>
        </section>
      )}

      <RecoveryPlans
        plans={plans}
        selectedPlanId={selectedPlanId}
        setSelectedPlanId={setSelectedPlanId}
        selectedPlan={selectedPlan}
        applying={applying}
        applyRecoveryPlan={applyRecoveryPlan}
        recoveryResolved={recoveryResolved}
      />

      {selectedPlan && !recoveryResolved && (
        <section className="content-card recovery-decision-card">
          <div className="card-header">
            <div>
              <span className="small-label">PLAN ANALYSIS</span>
              <h2>Before you apply</h2>
            </div>
          </div>

          <div className="recovery-decision-grid">
            <div>
              <span>SELECTED PLAN</span>
              <strong>{selectedPlan.plan_id}</strong>
            </div>

            <div>
              <span>BOOKINGS CHANGED</span>
              <strong>{selectedPlan.bookings_changed ?? 0}</strong>
            </div>

            <div>
              <span>ADDITIONAL DELAY</span>
              <strong>
                {selectedPlan.additional_delay_minutes || 0} min
              </strong>
            </div>

            <div>
              <span>COST CHANGE</span>
              <strong>
                ₹{Number(selectedPlan.cost_difference || 0).toLocaleString("en-IN")}
              </strong>
            </div>
          </div>

          <p className="recovery-decision-note">
            Applying a recovery plan will reconstruct the affected itinerary
            using the selected plan's proposed booking changes.
          </p>
        </section>
      )}
    </div>
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
   BOOKINGS PAGE
========================================================= */

function BookingsPage({
  bookings,
  onRefresh,
  refreshing,
  onOpenDashboard,
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBookingId, setSelectedBookingId] = useState(
    bookings[0]?.id ?? null
  );

  const filteredBookings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...bookings]
      .filter((booking) => {
        const searchable = [
          booking.name,
          booking.provider,
          booking.type,
          booking.external_reference,
          booking.location,
          booking.destination,
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());

        const matchesQuery =
          !normalizedQuery ||
          searchable.some((value) => value.includes(normalizedQuery));

        const matchesType =
          typeFilter === "ALL" ||
          String(booking.type || "").toUpperCase() === typeFilter;

        const matchesStatus =
          statusFilter === "ALL" ||
          String(booking.status || "CONFIRMED").toUpperCase() ===
            statusFilter;

        return matchesQuery && matchesType && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(a.start_time || 0).getTime() -
          new Date(b.start_time || 0).getTime()
      );
  }, [bookings, query, typeFilter, statusFilter]);

  useEffect(() => {
    if (
      selectedBookingId &&
      filteredBookings.some((booking) => booking.id === selectedBookingId)
    ) {
      return;
    }

    setSelectedBookingId(filteredBookings[0]?.id ?? null);
  }, [filteredBookings, selectedBookingId]);

  const selectedBooking =
    bookings.find((booking) => booking.id === selectedBookingId) || null;

  const bookingTypes = [
    "ALL",
    ...Array.from(
      new Set(
        bookings
          .map((booking) => String(booking.type || "").toUpperCase())
          .filter(Boolean)
      )
    ),
  ];

  const bookingStatuses = [
    "ALL",
    ...Array.from(
      new Set(
        bookings
          .map((booking) => String(booking.status || "CONFIRMED").toUpperCase())
          .filter(Boolean)
      )
    ),
  ];

  const confirmedCount = bookings.filter(
    (booking) =>
      String(booking.status || "CONFIRMED").toUpperCase() === "CONFIRMED"
  ).length;

  const affectedCount = bookings.filter(
    (booking) => String(booking.status || "").toUpperCase() === "AFFECTED"
  ).length;

  function getDependencies(booking) {
    if (!booking?.depends_on) return [];

    if (Array.isArray(booking.depends_on)) {
      return booking.depends_on;
    }

    try {
      const parsed = JSON.parse(booking.depends_on);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function statusClass(status) {
    const value = String(status || "CONFIRMED").toUpperCase();
    if (value === "AFFECTED" || value === "DISRUPTED") {
      return "booking-status-warning";
    }
    if (value === "CANCELLED" || value === "FAILED") {
      return "booking-status-danger";
    }
    return "booking-status-success";
  }

  return (
    <div className="page-stack" style={{ gap: "18px" }}>
      <section
        className="page-header-card"
        style={{
          padding: "24px 26px",
          alignItems: "center",
          minHeight: "auto",
        }}
      >
        <div>
          <span className="small-label">CONNECTED SERVICES</span>
          <h1 style={{ margin: "6px 0 5px", fontSize: "30px" }}>
            Bookings
          </h1>
          <p style={{ margin: 0, maxWidth: "650px" }}>
            Your connected journey services, schedules, providers and
            dependencies in one place.
          </p>
        </div>

        <div style={{ display: "flex", gap: "9px", flexShrink: 0 }}>
          <button
            className="view-all-button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
          <button className="return-dashboard-button" onClick={onOpenDashboard}>
            ← Dashboard
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        {[
          ["TOTAL", bookings.length, "Connected services"],
          ["CONFIRMED", confirmedCount, "Currently confirmed"],
          ["AFFECTED", affectedCount, "Need attention"],
          ["NODES", bookings.length, "Dependency nodes"],
        ].map(([label, value, caption]) => (
          <div
            key={label}
            style={{
              background: "#fff",
              border: "1px solid #e8edf5",
              borderRadius: "14px",
              padding: "16px 18px",
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)",
            }}
          >
            <span className="small-label">{label}</span>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                marginTop: "5px",
              }}
            >
              <strong style={{ fontSize: "25px", lineHeight: 1 }}>
                {value}
              </strong>
              <span style={{ color: "#64748b", fontSize: "12px" }}>
                {caption}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section
        className="content-card"
        style={{
          padding: "20px",
          overflow: "visible",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "13px",
          }}
        >
          <div>
            <span className="small-label">BOOKING MANAGEMENT</span>
            <h2 style={{ margin: "5px 0 0", fontSize: "20px" }}>
              Journey services
            </h2>
          </div>

          <span className="plan-count-badge">
            {filteredBookings.length} shown
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(240px, 1fr) 150px 150px",
            gap: "9px",
            marginBottom: "14px",
          }}
        >
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                fontSize: "14px",
              }}
            >
              ⌕
            </span>
            <input
              className="trip-search-input"
              style={{
                width: "100%",
                boxSizing: "border-box",
                paddingLeft: "35px",
                height: "42px",
                borderRadius: "10px",
                border: "1px solid #dbe3ef",
                background: "#fbfcfe",
                fontSize: "13px",
              }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search booking, provider or route..."
            />
          </div>

          <select
            className="trip-search-input"
            style={{
              height: "42px",
              borderRadius: "10px",
              border: "1px solid #dbe3ef",
              background: "#fbfcfe",
              fontSize: "13px",
              padding: "0 10px",
            }}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            {bookingTypes.map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? "All types" : type}
              </option>
            ))}
          </select>

          <select
            className="trip-search-input"
            style={{
              height: "42px",
              borderRadius: "10px",
              border: "1px solid #dbe3ef",
              background: "#fbfcfe",
              fontSize: "13px",
              padding: "0 10px",
            }}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {bookingStatuses.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All statuses" : status}
              </option>
            ))}
          </select>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="empty-state-new">
            <div>▣</div>
            <strong>No bookings found</strong>
            <span>Try changing the search text or filters.</span>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.55fr) minmax(310px, 0.8fr)",
              gap: "14px",
              alignItems: "start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {filteredBookings.map((booking, index) => {
                const selected = booking.id === selectedBookingId;
                const status = String(
                  booking.status || "CONFIRMED"
                ).toUpperCase();

                return (
                  <button
                    type="button"
                    key={booking.id}
                    onClick={() => setSelectedBookingId(booking.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: selected
                        ? "1px solid #3b82f6"
                        : "1px solid #e6ebf2",
                      background: selected ? "#f5f9ff" : "#fff",
                      borderRadius: "12px",
                      padding: "13px 14px",
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: "38px minmax(0, 1fr) auto",
                      gap: "12px",
                      alignItems: "center",
                      boxShadow: selected
                        ? "0 3px 12px rgba(37, 99, 235, 0.08)"
                        : "none",
                    }}
                  >
                    <div
                      className="booking-summary-icon"
                      style={{
                        width: "38px",
                        height: "38px",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {getBookingIcon(booking.type)}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        display: "grid",
                        gap: "3px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          minWidth: 0,
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "13px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {booking.name}
                        </strong>
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "11px",
                            flexShrink: 0,
                          }}
                        >
                          {booking.external_reference || "—"}
                        </span>
                      </div>

                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        {booking.location || "—"} →{" "}
                        {booking.destination || "—"}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ textAlign: "right" }}>
                        <strong style={{ display: "block", fontSize: "12px" }}>
                          {formatShortDate(booking.start_time)}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            color: "#64748b",
                            fontSize: "11px",
                            marginTop: "2px",
                          }}
                        >
                          {formatTime(booking.start_time)}
                        </span>
                      </div>

                      <span
                        className={`booking-status-pill ${statusClass(status)}`}
                        style={{ fontSize: "9px" }}
                      >
                        {status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <aside
              style={{
                border: "1px solid #e6ebf2",
                borderRadius: "13px",
                padding: "17px",
                background: "#fbfcfe",
                position: "sticky",
                top: "16px",
              }}
            >
              {selectedBooking ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      alignItems: "flex-start",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span className="small-label">BOOKING DETAILS</span>
                      <h3
                        style={{
                          margin: "5px 0 3px",
                          fontSize: "17px",
                          lineHeight: 1.25,
                        }}
                      >
                        {selectedBooking.name}
                      </h3>
                      <span style={{ color: "#64748b", fontSize: "11px" }}>
                        {selectedBooking.external_reference || "No reference"}
                      </span>
                    </div>

                    <div className="booking-summary-icon">
                      {getBookingIcon(selectedBooking.type)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "7px",
                    }}
                  >
                    {[
                      ["TYPE", getBookingLabel(selectedBooking.type)],
                      ["STATUS", selectedBooking.status || "CONFIRMED"],
                      ["PROVIDER", selectedBooking.provider || "—"],
                      [
                        "COST",
                        selectedBooking.cost != null
                          ? `₹${Number(selectedBooking.cost).toLocaleString(
                              "en-IN"
                            )}`
                          : "—",
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        style={{
                          background: "#fff",
                          border: "1px solid #e7ebf1",
                          borderRadius: "9px",
                          padding: "9px 10px",
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            color: "#94a3b8",
                            fontSize: "8px",
                            fontWeight: 800,
                            letterSpacing: "1.1px",
                          }}
                        >
                          {label}
                        </span>
                        <strong
                          style={{
                            display: "block",
                            marginTop: "4px",
                            fontSize: "12px",
                            wordBreak: "break-word",
                          }}
                        >
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: "9px",
                      padding: "11px 12px",
                      borderRadius: "10px",
                      background: "#fff",
                      border: "1px solid #e7ebf1",
                    }}
                  >
                    <span className="small-label">ROUTE</span>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "5px",
                        fontSize: "13px",
                      }}
                    >
                      {selectedBooking.location || "—"} →{" "}
                      {selectedBooking.destination || "—"}
                    </strong>
                  </div>

                  <div
                    style={{
                      marginTop: "9px",
                      padding: "11px 12px",
                      borderRadius: "10px",
                      background: "#fff",
                      border: "1px solid #e7ebf1",
                    }}
                  >
                    <span className="small-label">SCHEDULE</span>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr",
                        alignItems: "center",
                        gap: "7px",
                        marginTop: "7px",
                      }}
                    >
                      <strong style={{ fontSize: "11px" }}>
                        {formatDateTime(selectedBooking.start_time)}
                      </strong>
                      <span style={{ color: "#94a3b8" }}>→</span>
                      <strong style={{ fontSize: "11px" }}>
                        {formatDateTime(selectedBooking.end_time)}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "9px",
                      padding: "11px 12px",
                      borderRadius: "10px",
                      background: "#fff",
                      border: "1px solid #e7ebf1",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span className="small-label">DEPENDENCIES</span>
                      <span
                        style={{
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        {selectedBooking.buffer_minutes ?? 0} min buffer
                      </span>
                    </div>

                    {getDependencies(selectedBooking).length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginTop: "7px",
                        }}
                      >
                        {getDependencies(selectedBooking).map((dependency) => (
                          <span
                            key={dependency}
                            style={{
                              padding: "5px 8px",
                              borderRadius: "7px",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            {dependency}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "#64748b",
                          fontSize: "11px",
                        }}
                      >
                        No upstream dependency
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <strong>Select a booking</strong>
                  <p>
                    Choose a booking from the itinerary list to inspect its
                    details.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
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

          {activePage === "recovery" && (
            <RecoveryPlansPage
              plans={plans}
              selectedPlanId={selectedPlanId}
              setSelectedPlanId={setSelectedPlanId}
              selectedPlan={selectedPlan}
              applying={applying}
              applyRecoveryPlan={applyRecoveryPlan}
              recoveryResolved={recoveryResolved}
              disruption={targetDisruption}
              impact={impact}
              onOpenDashboard={() => setActivePage("dashboard")}
            />
          )}

          {activePage === "bookings" && (
            <BookingsPage
              bookings={bookings}
              onRefresh={() => loadDashboard(true)}
              refreshing={refreshing}
              onOpenDashboard={() => setActivePage("dashboard")}
            />
          )}

          {activePage === "assistant" && (
            <AIAssistantPage
              bookings={bookings}
              disruptions={disruptions}
              impact={impact}
              plans={plans}
              onRefresh={() => loadDashboard(true)}
              refreshing={refreshing}
              onOpenDashboard={() => setActivePage("dashboard")}
            />
          )}

          {activePage === "settings" && (
            <SettingsPage
              currentUser={auth?.user}
              onOpenDashboard={() => setActivePage("dashboard")}
              onLogout={onLogout}
            />
          )}

          {activePage !== "dashboard" &&
            activePage !== "trips" &&
            activePage !== "live" &&
            activePage !== "recovery" &&
            activePage !== "bookings" &&
            activePage !== "assistant" &&
            activePage !== "settings" && (
              <div className="page-placeholder">
                <span className="small-label">TRAVELRESCUE</span>
                <h1>
                  {activePage === "disruptions" && "Disruptions"}
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
   AI ASSISTANT
========================================================= */

function AIAssistantPage({
  bookings,
  disruptions,
  impact,
  plans,
  onRefresh,
  refreshing,
  onOpenDashboard,
}) {
  const activeDisruption =
    disruptions
      .filter((item) => item.status === "ACTIVE")
      .sort((a, b) => b.id - a.id)[0] || null;

  const flight =
    bookings.find(
      (booking) => booking.external_reference === "AI101"
    ) ||
    bookings.find(
      (booking) => String(booking.type || "").toUpperCase() === "FLIGHT"
    );

  const downstreamBookings = impact?.downstream_bookings || [];
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text:
        "Hi! I’m the TravelRescue Copilot. I can explain your current disruption, trace the cascade, summarize recovery plans, and help you understand what happens next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const context = useMemo(
    () => ({
      flight,
      activeDisruption,
      downstreamBookings,
      plans,
      bookings,
    }),
    [flight, activeDisruption, downstreamBookings, plans, bookings]
  );

  function formatPlan(plan) {
    if (!plan) return "No recovery plan is currently available.";
    const changes = plan.changes || plan.booking_changes || [];
    const changeCount = Array.isArray(changes) ? changes.length : 0;
    const cost =
      plan.cost_difference ??
      plan.additional_cost ??
      plan.total_cost_difference ??
      null;

    return `${plan.plan_id || "Plan"} changes ${changeCount} booking${
      changeCount === 1 ? "" : "s"
    }${cost != null ? ` with a cost difference of ₹${Number(cost).toLocaleString("en-IN")}` : ""}.`;
  }

  function buildResponse(question) {
    const q = question.toLowerCase();

    if (
      q.includes("what happened") ||
      q.includes("why") ||
      q.includes("disruption") ||
      q.includes("delay")
    ) {
      if (!activeDisruption) {
        return "There is no active disruption currently recorded for this trip. The monitoring service can be checked from Live Updates.";
      }

      const delay = activeDisruption.delay_minutes || 0;
      const severity = activeDisruption.severity || "MEDIUM";
      const affected = downstreamBookings.length;

      return `AI101 is currently showing a ${delay}-minute flight delay with ${severity} severity. TravelRescue detected the disruption and traced ${affected} downstream booking${
        affected === 1 ? "" : "s"
      }. ${
        activeDisruption.description ||
        "The dependency graph is being used to determine which connected services may be affected."
      }`;
    }

    if (
      q.includes("affected") ||
      q.includes("cascade") ||
      q.includes("downstream") ||
      q.includes("impact")
    ) {
      if (!downstreamBookings.length) {
        return "No downstream bookings are currently marked as affected.";
      }

      const names = downstreamBookings
        .slice(0, 4)
        .map((booking) => booking.name)
        .filter(Boolean);

      return `The disruption currently affects ${downstreamBookings.length} downstream booking${
        downstreamBookings.length === 1 ? "" : "s"
      }: ${names.join(", ")}. TravelRescue identifies these through the booking dependency graph rather than treating each booking independently.`;
    }

    if (
      q.includes("recovery") ||
      q.includes("plan") ||
      q.includes("option") ||
      q.includes("alternative")
    ) {
      if (!plans.length) {
        return "There are no recovery plans available for the current disruption. Refresh the trip data or generate plans from the Recovery Plans section.";
      }

      return `TravelRescue has generated ${plans.length} recovery option${
        plans.length === 1 ? "" : "s"
      }. ${plans
        .slice(0, 3)
        .map(formatPlan)
        .join(" ")} Open Recovery Plans to inspect the exact booking changes before applying one.`;
    }

    if (
      q.includes("what should i do") ||
      q.includes("recommend") ||
      q.includes("next step") ||
      q.includes("now")
    ) {
      if (activeDisruption && plans.length) {
        return `Your trip has an active ${activeDisruption.severity || "MEDIUM"} disruption and ${plans.length} recovery option${
          plans.length === 1 ? "" : "s"
        }. The next step is to review the proposed changes and trade-offs in Recovery Plans before approving a reconstruction.`;
      }

      return "The next step is to run a live provider check, review any detected disruption, and then inspect recovery options if the itinerary is affected.";
    }

    if (
      q.includes("flight") ||
      q.includes("ai101") ||
      q.includes("status")
    ) {
      if (!flight) {
        return "I don't currently have a flight booking in the loaded itinerary.";
      }

      return `${flight.name || "Flight"} (${flight.external_reference || "—"}) is scheduled from ${
        flight.location || "—"
      } to ${flight.destination || "—"}. Its current booking status is ${
        flight.status || "CONFIRMED"
      }.${
        activeDisruption?.delay_minutes
          ? ` The active disruption records a ${activeDisruption.delay_minutes}-minute delay.`
          : ""
      }`;
    }

    if (
      q.includes("booking") ||
      q.includes("itinerary") ||
      q.includes("trip")
    ) {
      return `Your current itinerary contains ${bookings.length} connected booking${
        bookings.length === 1 ? "" : "s"
      }. TravelRescue links them through dependencies so a disruption in one service can be propagated to downstream services.`;
    }

    return `I can help with this trip using the information currently loaded in TravelRescue. Try asking me "What happened?", "What bookings are affected?", "Explain the recovery options", or "What should I do next?"`;
  }

  function submitQuestion(question = input) {
    const trimmed = String(question || "").trim();
    if (!trimmed || thinking) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setThinking(true);

    window.setTimeout(() => {
      const answer = buildResponse(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: answer,
        },
      ]);
      setThinking(false);
    }, 450);
  }

  const quickQuestions = [
    "What happened to my flight?",
    "Which bookings are affected?",
    "Explain the recovery options",
    "What should I do next?",
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        minHeight: "calc(100vh - 150px)",
      }}
    >
      <section
        style={{
          background: "#fff",
          border: "1px solid #e7ebf2",
          borderRadius: "16px",
          padding: "22px 24px",
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          alignItems: "center",
        }}
      >
        <div>
          <span className="small-label">TRAVELRESCUE COPILOT</span>
          <h1 style={{ margin: "5px 0", fontSize: "28px" }}>
            AI Assistant
          </h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Ask questions about your live itinerary, disruption impact and
            recovery options.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            className="view-all-button"
            onClick={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh context"}
          </button>
          <button className="return-dashboard-button" onClick={onOpenDashboard}>
            ← Dashboard
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 290px",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            minHeight: "560px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "15px 18px",
              borderBottom: "1px solid #edf1f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  background: "#eef4ff",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                }}
              >
                ✦
              </div>
              <div>
                <strong style={{ display: "block", fontSize: "13px" }}>
                  TravelRescue Copilot
                </strong>
                <span style={{ color: "#16a34a", fontSize: "10px" }}>
                  ● Context connected
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: "10px",
                color: "#64748b",
                background: "#f8fafc",
                padding: "6px 8px",
                borderRadius: "7px",
              }}
            >
              Trip #{TRIP_ID}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              padding: "18px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#fbfcfe",
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  flexDirection:
                    message.role === "user" ? "row-reverse" : "row",
                }}
              >
                {message.role === "assistant" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      flexShrink: 0,
                      borderRadius: "9px",
                      background: "#2563eb",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    ✦
                  </div>
                )}

                <div
                  style={{
                    padding: "11px 13px",
                    borderRadius:
                      message.role === "user"
                        ? "13px 13px 3px 13px"
                        : "3px 13px 13px 13px",
                    background:
                      message.role === "user" ? "#2563eb" : "#fff",
                    color: message.role === "user" ? "#fff" : "#334155",
                    border:
                      message.role === "user"
                        ? "none"
                        : "1px solid #e5eaf1",
                    fontSize: "12px",
                    lineHeight: 1.55,
                    boxShadow:
                      message.role === "user"
                        ? "0 4px 12px rgba(37,99,235,.12)"
                        : "none",
                  }}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {thinking && (
              <div
                style={{
                  alignSelf: "flex-start",
                  color: "#64748b",
                  fontSize: "11px",
                  paddingLeft: "36px",
                }}
              >
                Copilot is analyzing your trip context…
              </div>
            )}
          </div>

          <div
            style={{
              padding: "12px 14px 14px",
              borderTop: "1px solid #edf1f6",
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "7px",
                overflowX: "auto",
                paddingBottom: "9px",
              }}
            >
              {quickQuestions.map((question) => (
                <button
                  type="button"
                  key={question}
                  onClick={() => submitQuestion(question)}
                  style={{
                    border: "1px solid #dbe4f0",
                    background: "#f8fafc",
                    color: "#475569",
                    borderRadius: "8px",
                    padding: "7px 9px",
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  {question}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitQuestion();
              }}
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your trip..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: "44px",
                  borderRadius: "10px",
                  border: "1px solid #dbe3ef",
                  background: "#fbfcfe",
                  padding: "0 13px",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                className="return-dashboard-button"
                disabled={!input.trim() || thinking}
                style={{ minWidth: "76px" }}
              >
                Send
              </button>
            </form>
          </div>
        </div>

        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7ebf2",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <span className="small-label">LIVE CONTEXT</span>

            {[
              [
                "Flight",
                flight
                  ? `${flight.external_reference || "Flight"} · ${
                      flight.location || "—"
                    } → ${flight.destination || "—"}`
                  : "No flight loaded",
              ],
              [
                "Disruption",
                activeDisruption
                  ? `${activeDisruption.severity || "MEDIUM"} · ${
                      activeDisruption.delay_minutes || 0
                    } min delay`
                  : "None active",
              ],
              ["Affected", `${downstreamBookings.length} downstream`],
              ["Recovery", `${plans.length} plan${plans.length === 1 ? "" : "s"}`],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "11px 0",
                  borderBottom: "1px solid #f0f2f6",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "9px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                  }}
                >
                  {label}
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    fontSize: "11px",
                    lineHeight: 1.4,
                  }}
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#f5f9ff",
              border: "1px solid #dbeafe",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <span className="small-label">WHAT IT CAN EXPLAIN</span>
            <div
              style={{
                display: "grid",
                gap: "8px",
                marginTop: "10px",
              }}
            >
              {[
                "Why the disruption happened",
                "Which bookings are affected",
                "How the dependency cascade works",
                "What recovery options change",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: "flex",
                    gap: "7px",
                    color: "#475569",
                    fontSize: "10px",
                    lineHeight: 1.35,
                  }}
                >
                  <span style={{ color: "#2563eb", fontWeight: 800 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e7ebf2",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <span className="small-label">SAFETY CHECK</span>
            <p
              style={{
                margin: "9px 0 0",
                color: "#64748b",
                fontSize: "10px",
                lineHeight: 1.5,
              }}
            >
              The assistant explains data produced by TravelRescue's
              monitoring, dependency and recovery engines. Booking changes
              still require traveler approval.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({
  currentUser,
  onOpenDashboard,
  onLogout,
}) {
  const [notifications, setNotifications] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState(true);
  const [recoveryApproval, setRecoveryApproval] = useState(true);
  const [flexibility, setFlexibility] = useState("MODERATE");
  const [maxExtraCost, setMaxExtraCost] = useState("5000");
  const [saved, setSaved] = useState(false);

  function savePreferences() {
    const preferences = {
      notifications,
      liveAlerts,
      recoveryApproval,
      flexibility,
      maxExtraCost,
    };

    localStorage.setItem(
      "travelrescue_preferences",
      JSON.stringify(preferences)
    );

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem("travelrescue_preferences");
      if (!stored) return;

      const preferences = JSON.parse(stored);

      if (typeof preferences.notifications === "boolean") {
        setNotifications(preferences.notifications);
      }
      if (typeof preferences.liveAlerts === "boolean") {
        setLiveAlerts(preferences.liveAlerts);
      }
      if (typeof preferences.recoveryApproval === "boolean") {
        setRecoveryApproval(preferences.recoveryApproval);
      }
      if (preferences.flexibility) {
        setFlexibility(preferences.flexibility);
      }
      if (preferences.maxExtraCost != null) {
        setMaxExtraCost(String(preferences.maxExtraCost));
      }
    } catch {
      // Ignore malformed local preference data.
    }
  }, []);

  const userName =
    currentUser?.name ||
    currentUser?.username ||
    "TravelRescue traveler";

  const userEmail = currentUser?.email || "Account email";

  function Toggle({ checked, onChange }) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: "42px",
          height: "24px",
          padding: "3px",
          border: "none",
          borderRadius: "999px",
          background: checked ? "#2563eb" : "#cbd5e1",
          cursor: "pointer",
          display: "flex",
          justifyContent: checked ? "flex-end" : "flex-start",
          alignItems: "center",
          flexShrink: 0,
          transition: "all .15s ease",
        }}
      >
        <span
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(15,23,42,.2)",
          }}
        />
      </button>
    );
  }

  function SettingRow({
    title,
    description,
    children,
  }) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
          padding: "15px 0",
          borderBottom: "1px solid #edf1f6",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              fontSize: "12px",
              color: "#1e293b",
            }}
          >
            {title}
          </strong>
          <span
            style={{
              display: "block",
              marginTop: "4px",
              color: "#64748b",
              fontSize: "10px",
              lineHeight: 1.45,
              maxWidth: "580px",
            }}
          >
            {description}
          </span>
        </div>

        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
      }}
    >
      <section
        style={{
          background: "#fff",
          border: "1px solid #e7ebf2",
          borderRadius: "16px",
          padding: "22px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div>
          <span className="small-label">ACCOUNT & PREFERENCES</span>
          <h1 style={{ margin: "5px 0", fontSize: "28px" }}>Settings</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
            Control how TravelRescue monitors your journey and handles
            recovery decisions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            className="view-all-button"
            onClick={savePreferences}
          >
            {saved ? "✓ Saved" : "Save preferences"}
          </button>
          <button
            className="return-dashboard-button"
            onClick={onOpenDashboard}
          >
            ← Dashboard
          </button>
        </div>
      </section>

      {saved && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            color: "#166534",
            borderRadius: "11px",
            padding: "10px 13px",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          Travel preferences saved on this device.
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, .75fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7ebf2",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <span className="small-label">TRAVEL PREFERENCES</span>
          <h2 style={{ margin: "5px 0 2px", fontSize: "18px" }}>
            Recovery behavior
          </h2>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "11px",
            }}
          >
            These preferences can be used by the recovery optimizer when
            evaluating alternative itineraries.
          </p>

          <SettingRow
            title="Recovery approval required"
            description="Keep traveler approval before any recovery plan is applied."
          >
            <Toggle
              checked={recoveryApproval}
              onChange={setRecoveryApproval}
            />
          </SettingRow>

          <SettingRow
            title="Travel flexibility"
            description="How much schedule movement the recovery engine may consider."
          >
            <select
              value={flexibility}
              onChange={(event) => setFlexibility(event.target.value)}
              style={{
                height: "36px",
                minWidth: "125px",
                border: "1px solid #dbe3ef",
                borderRadius: "8px",
                background: "#fbfcfe",
                padding: "0 9px",
                fontSize: "11px",
                color: "#334155",
              }}
            >
              <option value="LOW">Low</option>
              <option value="MODERATE">Moderate</option>
              <option value="HIGH">High</option>
            </select>
          </SettingRow>

          <SettingRow
            title="Maximum extra cost"
            description="Preferred ceiling for additional recovery cost."
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  color: "#64748b",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="500"
                value={maxExtraCost}
                onChange={(event) => setMaxExtraCost(event.target.value)}
                style={{
                  width: "105px",
                  height: "36px",
                  boxSizing: "border-box",
                  border: "1px solid #dbe3ef",
                  borderRadius: "8px",
                  background: "#fbfcfe",
                  padding: "0 9px",
                  fontSize: "11px",
                }}
              />
            </div>
          </SettingRow>
        </div>

        <div
          style={{
            display: "grid",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <span className="small-label">NOTIFICATIONS</span>

            <SettingRow
              title="TravelRescue notifications"
              description="Receive important trip and recovery updates."
            >
              <Toggle
                checked={notifications}
                onChange={setNotifications}
              />
            </SettingRow>

            <SettingRow
              title="Live disruption alerts"
              description="Surface provider monitoring changes as they are detected."
            >
              <Toggle
                checked={liveAlerts}
                onChange={setLiveAlerts}
              />
            </SettingRow>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
              padding: "20px",
            }}
          >
            <span className="small-label">PROFILE</span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "13px",
                  background: "#eef4ff",
                  color: "#2563eb",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "16px",
                }}
              >
                {String(userName).charAt(0).toUpperCase()}
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "13px",
                  }}
                >
                  {userName}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: "3px",
                    color: "#64748b",
                    fontSize: "10px",
                  }}
                >
                  {userEmail}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "6px",
                    padding: "4px 7px",
                    borderRadius: "6px",
                    background: "#f1f5f9",
                    color: "#64748b",
                    fontSize: "9px",
                    fontWeight: 800,
                  }}
                >
                  {currentUser?.role || "TRAVELER"}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e7ebf2",
              borderRadius: "16px",
              padding: "18px",
            }}
          >
            <span className="small-label">SYSTEM</span>

            <div
              style={{
                display: "grid",
                gap: "8px",
                marginTop: "11px",
              }}
            >
              {[
                ["Monitoring", "Operational"],
                ["Dependency engine", "Connected"],
                ["Recovery engine", "Connected"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    fontSize: "10px",
                  }}
                >
                  <span style={{ color: "#64748b" }}>{label}</span>
                  <span
                    style={{
                      color: "#15803d",
                      fontWeight: 700,
                    }}
                  >
                    ● {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e7ebf2",
          borderRadius: "16px",
          padding: "18px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
        }}
      >
        <div>
          <span className="small-label">SESSION</span>
          <strong
            style={{
              display: "block",
              marginTop: "5px",
              fontSize: "12px",
            }}
          >
            Sign out of TravelRescue
          </strong>
          <span
            style={{
              display: "block",
              marginTop: "3px",
              color: "#64748b",
              fontSize: "10px",
            }}
          >
            Your saved preferences remain on this device.
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          style={{
            height: "36px",
            padding: "0 13px",
            borderRadius: "8px",
            border: "1px solid #fecaca",
            background: "#fff",
            color: "#b91c1c",
            fontSize: "11px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </section>
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
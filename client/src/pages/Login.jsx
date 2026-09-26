import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const icons = {
    box: (
      <svg {...common}>
        <path d="M3 7.5 12 3l9 4.5L12 12 3 7.5Z" />
        <path d="M3 7.5V17l9 4 9-4V7.5" />
        <path d="M12 12v9" />
      </svg>
    ),

    warehouse: (
      <svg {...common}>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),

    truck: (
      <svg {...common}>
        <path d="M3 6h11v11H3z" />
        <path d="M14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
      </svg>
    ),

    transfer: (
      <svg {...common}>
        <path d="M4 8h15" />
        <path d="m15 4 4 4-4 4" />
        <path d="M20 16H5" />
        <path d="m9 12-4 4 4 4" />
      </svg>
    ),

    receipt: (
      <svg {...common}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    ),

    mail: (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),

    lock: (
      <svg {...common}>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    ),

    eye: (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),

    eyeOff: (
      <svg {...common}>
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.1 3.9" />
        <path d="M6.6 6.6C4 8.2 2.5 12 2.5 12s3.5 7 9.5 7c1.3 0 2.5-.3 3.6-.8" />
      </svg>
    ),

    arrow: (
      <svg {...common}>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),

    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
  };

  return icons[name] || null;
}

/* --------------------------------------------------
   BACKGROUND INVENTORY GRAPHIC
-------------------------------------------------- */

function InventoryGraphic() {
  return (
    <div className="login-inventory-art" aria-hidden="true">

      <div className="login-blueprint-grid" />

      <div className="login-art-caption">
        INVENTORY FLOW
      </div>

      <div className="login-art-label label-one">
        RECEIVE
      </div>

      <div className="login-art-label label-two">
        STORE
      </div>

      <div className="login-art-label label-three">
        MOVE
      </div>

      <div className="login-art-label label-four">
        DELIVER
      </div>

      {/* warehouse shelves */}

      <div className="login-rack rack-one">
        <span />
        <span />
        <span />
      </div>

      <div className="login-rack rack-two">
        <span />
        <span />
        <span />
      </div>

      {/* boxes */}

      <div className="login-box box-one">
        <Icon name="box" size={14} />
      </div>

      <div className="login-box box-two">
        <Icon name="box" size={12} />
      </div>

      <div className="login-box box-three">
        <Icon name="box" size={12} />
      </div>

      <div className="login-box box-four">
        <Icon name="box" size={13} />
      </div>

      {/* tracing lines */}

      <div className="login-trace trace-one">
        <span />
      </div>

      <div className="login-trace trace-two">
        <span />
      </div>

      <div className="login-trace trace-three">
        <span />
      </div>

      <div className="login-trace trace-four">
        <span />
      </div>

      {/* scanning line */}

      <div className="login-blueprint-scan" />

      {/* tiny live indicator */}

      <div className="login-art-status">
        <span />
        LIVE INVENTORY
      </div>

    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!email.trim()) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const { response, data } =
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to sign in."
        );
        return;
      }

      localStorage.setItem(
        "stocksenseToken",
        data.token
      );

      localStorage.setItem(
        "stocksenseUser",
        JSON.stringify(data.user)
      );

      navigate("/dashboard", {
        replace: true,
      });
    } catch {
      setError(
        "Unable to connect to the StockSense server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      {/* LEFT */}

      <section className="login-showcase">

        <InventoryGraphic />

        <div className="login-brand">

          <div className="login-brand-mark">
            S
          </div>

          <div>
            <strong>
              StockSense
            </strong>

            <span>
              Inventory Management
            </span>
          </div>

        </div>

        <div className="login-showcase-content">

          <div className="login-kicker">
            SMART INVENTORY CONTROL
          </div>

          <h1>
            Built to handle
            <br />
            all your{" "}
            <span>
              inventory
            </span>
            <br />
            operations.
          </h1>

          <p>
            Manage products, stock, warehouses,
            receipts, deliveries and internal
            movements from one simple workspace.
          </p>

          <div className="login-feature-list">

            <div>
              <span className="login-feature-check">
                <Icon
                  name="check"
                  size={12}
                />
              </span>

              <span>
                Real-time inventory tracking
              </span>
            </div>

            <div>
              <span className="login-feature-check">
                <Icon
                  name="check"
                  size={12}
                />
              </span>

              <span>
                Multi-location stock operations
              </span>
            </div>

            <div>
              <span className="login-feature-check">
                <Icon
                  name="check"
                  size={12}
                />
              </span>

              <span>
                Complete stock movement history
              </span>
            </div>

          </div>

        </div>

        <div className="login-copyright">
          © 2026 StockSense
        </div>

      </section>

      {/* RIGHT */}

      <section className="login-panel">

        <div className="login-form-wrapper">

          <div className="login-form-header">

            <div className="login-mobile-brand">

              <div className="login-brand-mark">
                S
              </div>

              <div>
                <strong>
                  StockSense
                </strong>

                <span>
                  Inventory Management
                </span>
              </div>

            </div>

            <h2>
              Welcome back
            </h2>

            <p>
              Sign in to continue to your
              inventory workspace.
            </p>

          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <div className="login-field">

              <label htmlFor="login-email">
                Email address
              </label>

              <div className="login-input-wrap">

                <span className="login-input-icon">
                  <Icon
                    name="mail"
                    size={17}
                  />
                </span>

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                />

              </div>

            </div>

            <div className="login-field">

              <div className="login-password-label">

                <label htmlFor="login-password">
                  Password
                </label>

                <Link to="/forgot-password">
                  Forgot password?
                </Link>

              </div>

              <div className="login-input-wrap">

                <span className="login-input-icon">
                  <Icon
                    name="lock"
                    size={17}
                  />
                </span>

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  <Icon
                    name={
                      showPassword
                        ? "eyeOff"
                        : "eye"
                    }
                    size={17}
                  />
                </button>

              </div>

            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}

              {!loading && (
                <Icon
                  name="arrow"
                  size={16}
                />
              )}
            </button>

          </form>

          <div className="login-divider">
            <span />
            <small>OR</small>
            <span />
          </div>

          <div className="login-signup">

            <span>
              Don't have an account?
            </span>

            <Link to="/signup">
              Create account
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}
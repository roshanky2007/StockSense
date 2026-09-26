import { useEffect, useMemo, useState } from "react";
import Shell from "../components/Shell";
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

    trend: (
      <svg {...common}>
        <path d="M4 17 9 12l4 4 7-8" />
        <path d="M15 8h5v5" />
      </svg>
    ),

    warning: (
      <svg {...common}>
        <path d="M12 4 21 20H3L12 4Z" />
        <path d="M12 9v5" />
        <path d="M12 17h.01" />
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

    receipt: (
      <svg {...common}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
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

    adjustment: (
      <svg {...common}>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
        <circle
          cx="9"
          cy="7"
          r="2"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="15"
          cy="12"
          r="2"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="11"
          cy="17"
          r="2"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    ),

    refresh: (
      <svg {...common}>
        <path d="M20 11a8 8 0 0 0-14.8-4" />
        <path d="M5 3v4h4" />
        <path d="M4 13a8 8 0 0 0 14.8 4" />
        <path d="M19 21v-4h-4" />
      </svg>
    ),

    arrowRight: (
      <svg {...common}>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),

    plus: (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),

    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),

    warehouse: (
      <svg {...common}>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),

    activity: (
      <svg {...common}>
        <path d="M3 12h4l2-6 4 12 2-6h6" />
      </svg>
    ),
  };

  return icons[name] || null;
}

function AnimatedNumber({ value }) {
  const target = Number(value || 0);
  const [number, setNumber] = useState(0);

  useEffect(() => {
    let frame;
    const startValue = 0;
    const startTime = performance.now();
    const duration = 650;

    const animate = (time) => {
      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      const current =
        startValue +
        (target - startValue) * eased;

      setNumber(current);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [target]);

  return Math.round(number).toLocaleString("en-IN");
}

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(initial = false) {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const [dashboardResult, productsResult] =
        await Promise.all([
          api("/dashboard"),
          api("/products"),
        ]);

      if (!dashboardResult.response.ok) {
        setError(
          dashboardResult.data?.message ||
            "Unable to load dashboard."
        );
        return;
      }

      if (!productsResult.response.ok) {
        setError(
          productsResult.data?.message ||
            "Unable to load products."
        );
        return;
      }

      setDashboard(dashboardResult.data);
      setProducts(productsResult.data || []);
    } catch {
      setError(
        "Unable to connect to the StockSense backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboard(true);
  }, []);

  const attentionProducts = useMemo(() => {
    return products
      .filter(
        (product) =>
          Number(product.stock || 0) <=
          Number(product.min_stock || 0)
      )
      .sort(
        (a, b) =>
          Number(a.stock || 0) -
          Number(b.stock || 0)
      );
  }, [products]);

  const healthyProducts = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.stock || 0) >
        Number(product.min_stock || 0)
    ).length;
  }, [products]);

  const healthPercent =
    products.length > 0
      ? Math.round(
          (healthyProducts / products.length) * 100
        )
      : 0;

  const greeting = getGreeting();

  return (
    <Shell
      title="Dashboard"
      subtitle="Inventory overview and operational activity."
    >
      <div className="dashboard-v2">

        {/* HERO */}

        <section className="dashboard-v2-hero">

          <div>
            <div className="dashboard-v2-kicker">
              INVENTORY OPERATIONS
            </div>

            <h1>
              {greeting},{" "}
              <span>{getFirstName()}</span>
            </h1>

            <p>
              See what needs attention and manage
              your inventory from one place.
            </p>
          </div>

          <button
            className="dashboard-v2-refresh"
            onClick={() =>
              loadDashboard(false)
            }
            title="Refresh dashboard"
          >
            <Icon
              name="refresh"
              size={17}
            />
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </section>

        {error && (
          <div className="dashboard-v2-error">
            {error}
          </div>
        )}

        {/* KPI */}

        <section className="dashboard-v2-kpis">

          <Kpi
            icon="box"
            tone="neutral"
            label="Total Products"
            value={
              dashboard?.totalProducts || 0
            }
            loading={loading}
          />

          <Kpi
            icon="trend"
            tone="green"
            label="Total Stock"
            value={
              dashboard?.totalStock || 0
            }
            loading={loading}
          />

          <Kpi
            icon="warning"
            tone="orange"
            label="Needs Reorder"
            value={
              dashboard?.reorderRequired ||
              dashboard?.lowStock ||
              0
            }
            loading={loading}
          />

          <Kpi
            icon="warning"
            tone="red"
            label="Out of Stock"
            value={
              dashboard?.outOfStock || 0
            }
            loading={loading}
          />

        </section>

        {/* QUICK ACTIONS */}

        <section className="dashboard-v2-section">

          <div className="dashboard-v2-section-heading">

            <div>
              <h2>
                Quick Actions
              </h2>

              <p>
                Start the inventory operation you
                need.
              </p>
            </div>

          </div>

          <div className="dashboard-v2-actions">

            <QuickAction
              href="/operations/receipts"
              icon="receipt"
              title="Receive Stock"
              description="Record goods arriving from a supplier."
            />

            <QuickAction
              href="/operations/deliveries"
              icon="truck"
              title="Create Delivery"
              description="Ship stock to a customer or destination."
            />

            <QuickAction
              href="/operations/transfers"
              icon="transfer"
              title="Transfer Stock"
              description="Move inventory between locations."
            />

            <QuickAction
              href="/operations/adjustments"
              icon="adjustment"
              title="Adjust Inventory"
              description="Correct stock using a physical count."
            />

          </div>

        </section>

        {/* MAIN CONTENT */}

        <section className="dashboard-v2-grid">

          {/* STOCK HEALTH */}

          <div className="dashboard-v2-panel">

            <div className="dashboard-v2-panel-header">

              <div>
                <h2>
                  Inventory Health
                </h2>

                <p>
                  Current stock condition across
                  your products.
                </p>
              </div>

              <div className="dashboard-v2-health-number">
                {healthPercent}%
              </div>

            </div>

            <div className="dashboard-v2-health">

              <div className="dashboard-v2-health-ring">
                <div>
                  <strong>
                    {healthPercent}%
                  </strong>

                  <span>
                    healthy
                  </span>
                </div>

                <svg
                  viewBox="0 0 100 100"
                  className="dashboard-health-svg"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="dashboard-health-track"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    className="dashboard-health-progress"
                    style={{
                      strokeDashoffset:
                        264 -
                        (264 *
                          healthPercent) /
                          100,
                    }}
                  />
                </svg>

              </div>

              <div className="dashboard-v2-health-stats">

                <HealthStat
                  label="Healthy"
                  value={healthyProducts}
                  tone="healthy"
                />

                <HealthStat
                  label="Needs Reorder"
                  value={
                    dashboard?.reorderRequired ||
                    dashboard?.lowStock ||
                    0
                  }
                  tone="warning"
                />

                <HealthStat
                  label="Out of Stock"
                  value={
                    dashboard?.outOfStock || 0
                  }
                  tone="danger"
                />

              </div>

            </div>

          </div>

          {/* ATTENTION */}

          <div className="dashboard-v2-panel">

            <div className="dashboard-v2-panel-header">

              <div>
                <h2>
                  Needs Attention
                </h2>

                <p>
                  Products at or below their
                  minimum stock.
                </p>
              </div>

              <a href="/products">
                View products
                <Icon
                  name="arrowRight"
                  size={13}
                />
              </a>

            </div>

            {attentionProducts.length ===
            0 ? (
              <div className="dashboard-v2-empty">
                <div>
                  <Icon
                    name="check"
                    size={19}
                  />
                </div>

                <strong>
                  Inventory is healthy
                </strong>

                <span>
                  No products currently require
                  replenishment.
                </span>
              </div>
            ) : (
              <div className="dashboard-v2-alert-list">

                {attentionProducts
                  .slice(0, 4)
                  .map((product) => {
                    const stock =
                      Number(
                        product.stock || 0
                      );

                    const minimum =
                      Number(
                        product.min_stock || 0
                      );

                    const percentage =
                      minimum > 0
                        ? Math.min(
                            100,
                            (stock /
                              minimum) *
                              100
                          )
                        : 0;

                    const out =
                      stock <= 0;

                    return (
                      <div
                        className="dashboard-v2-alert"
                        key={product.id}
                      >

                        <div className="dashboard-v2-alert-top">

                          <div className="dashboard-v2-product-icon">
                            {product.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {product.name}
                            </strong>

                            <span>
                              {product.sku}
                            </span>
                          </div>

                          <em
                            className={
                              out
                                ? "danger"
                                : "warning"
                            }
                          >
                            {out
                              ? "Out"
                              : "Low"}
                          </em>

                        </div>

                        <div className="dashboard-v2-alert-values">

                          <strong>
                            {stock}{" "}
                            {product.uom}
                          </strong>

                          <span>
                            minimum{" "}
                            {minimum}{" "}
                            {product.uom}
                          </span>

                        </div>

                        <div className="dashboard-v2-alert-track">

                          <div
                            className={
                              out
                                ? "danger"
                                : ""
                            }
                            style={{
                              width: `${Math.max(
                                percentage,
                                out ? 2 : 4
                              )}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  })}

              </div>
            )}

          </div>

        </section>

        {/* OPERATIONS */}

        <section className="dashboard-v2-section">

          <div className="dashboard-v2-section-heading">

            <div>
              <h2>
                Operations
              </h2>

              <p>
                Documents currently moving through
                your inventory workflow.
              </p>
            </div>

          </div>

          <div className="dashboard-v2-operations">

            <Operation
              icon="receipt"
              label="Pending Receipts"
              value={
                dashboard?.pendingReceipts || 0
              }
              href="/operations/receipts"
            />

            <Operation
              icon="truck"
              label="Pending Deliveries"
              value={
                dashboard?.pendingDeliveries || 0
              }
              href="/operations/deliveries"
            />

            <Operation
              icon="transfer"
              label="Scheduled Transfers"
              value={
                dashboard?.scheduledTransfers ||
                0
              }
              href="/operations/transfers"
            />

            <Operation
              icon="activity"
              label="Movement History"
              value={
                dashboard?.recentMovements
                  ?.length || 0
              }
              href="/operations/move-history"
            />

          </div>

        </section>

        {/* RECENT ACTIVITY */}

        <section className="dashboard-v2-panel dashboard-v2-activity">

          <div className="dashboard-v2-panel-header">

            <div>
              <h2>
                Recent Activity
              </h2>

              <p>
                Latest changes recorded in inventory.
              </p>
            </div>

            <a
              href="/operations/move-history"
            >
              View history
              <Icon
                name="arrowRight"
                size={13}
              />
            </a>

          </div>

          {loading ? (
            <div className="dashboard-v2-loading">
              Loading activity...
            </div>
          ) : dashboard?.recentMovements
              ?.length ? (
            <div className="dashboard-v2-activity-list">

              {dashboard.recentMovements
                .slice(0, 8)
                .map((movement, index) => (
                  <Activity
                    key={movement.id}
                    movement={movement}
                    index={index}
                  />
                ))}

            </div>
          ) : (
            <div className="dashboard-v2-empty activity">
              <Icon
                name="activity"
                size={20}
              />

              <strong>
                No activity yet
              </strong>

              <span>
                Inventory movements will appear
                here as operations are completed.
              </span>
            </div>
          )}

        </section>

      </div>
    </Shell>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  loading,
}) {
  return (
    <div className="dashboard-v2-kpi">

      <div
        className={`dashboard-v2-kpi-icon ${tone}`}
      >
        <Icon
          name={icon}
          size={20}
        />
      </div>

      <div>
        <span>
          {label}
        </span>

        {loading ? (
          <div className="dashboard-v2-skeleton" />
        ) : (
          <strong>
            <AnimatedNumber
              value={value}
            />
          </strong>
        )}
      </div>

    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
}) {
  return (
    <a
      href={href}
      className="dashboard-v2-action"
    >
      <div className="dashboard-v2-action-icon">
        <Icon
          name={icon}
          size={18}
        />
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

      <Icon
        name="arrowRight"
        size={15}
      />
    </a>
  );
}

function HealthStat({
  label,
  value,
  tone,
}) {
  return (
    <div className="dashboard-v2-health-stat">

      <div
        className={`dashboard-v2-health-dot ${tone}`}
      />

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

function Operation({
  icon,
  label,
  value,
  href,
}) {
  return (
    <a
      href={href}
      className="dashboard-v2-operation"
    >

      <div className="dashboard-v2-operation-icon">
        <Icon
          name={icon}
          size={17}
        />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>

      <Icon
        name="arrowRight"
        size={14}
      />

    </a>
  );
}

function Activity({
  movement,
  index,
}) {
  const config = {
    RECEIPT: {
      icon: "receipt",
      title: "Receipt",
      className: "receipt",
      prefix: "+",
    },

    DELIVERY: {
      icon: "truck",
      title: "Delivery",
      className: "delivery",
      prefix: "-",
    },

    TRANSFER: {
      icon: "transfer",
      title: "Internal Transfer",
      className: "transfer",
      prefix: "",
    },

    ADJUSTMENT: {
      icon: "adjustment",
      title: "Inventory Adjustment",
      className: "adjustment",
      prefix: "",
    },
  };

  const current =
    config[movement.type] ||
    config.ADJUSTMENT;

  return (
    <div
      className="dashboard-v2-activity-row"
      style={{
        animationDelay: `${index * 60}ms`,
      }}
    >

      <div
        className={`dashboard-v2-activity-icon ${current.className}`}
      >
        <Icon
          name={current.icon}
          size={16}
        />
      </div>

      <div className="dashboard-v2-activity-main">

        <strong>
          {current.title}
        </strong>

        <span>
          {movement.product_name}
          {" · "}
          {movement.reference ||
            "No reference"}
        </span>

      </div>

      <div className="dashboard-v2-activity-quantity">

        <strong
          className={current.className}
        >
          {current.prefix}
          {movement.quantity}
          {" "}
          {movement.uom || ""}
        </strong>

        <span>
          {movement.from_location &&
          movement.to_location
            ? `${movement.from_location} → ${movement.to_location}`
            : formatDate(
                movement.created_at
              )}
        </span>

      </div>

    </div>
  );
}

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getFirstName() {
  try {
    const user =
      JSON.parse(
        localStorage.getItem(
          "stocksenseUser"
        ) || "null"
      );

    return (
      user?.name
        ?.split(" ")
        ?.at(0) ||
      "there"
    );
  } catch {
    return "there";
  }
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(
    value.replace(" ", "T") + "Z"
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
}
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
    package: (
      <svg {...common}>
        <path d="M3 7.5 12 3l9 4.5L12 12 3 7.5Z" />
        <path d="M3 7.5V17l9 4 9-4V7.5" />
        <path d="M12 12v9" />
      </svg>
    ),

    arrowDown: (
      <svg {...common}>
        <path d="M12 4v14" />
        <path d="m6 12 6 6 6-6" />
      </svg>
    ),

    arrowUp: (
      <svg {...common}>
        <path d="M12 20V6" />
        <path d="m6 12 6-6 6 6" />
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
        <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),

    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
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

    warehouse: (
      <svg {...common}>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),

    close: (
      <svg {...common}>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </svg>
    ),
  };

  return icons[name] || null;
}

const CONFIG = {
  RECEIPT: {
    title: "Receipts",
    subtitle:
      "Record incoming stock arriving from suppliers.",
    actionLabel: "Record Receipt",
    quantityLabel: "Quantity Received",
    referenceLabel: "Supplier / PO Reference",
    referencePlaceholder:
      "Example: PO-1042 / Supplier reference",
    icon: "arrowDown",
    tone: "receipt",
  },

  DELIVERY: {
    title: "Delivery Orders",
    subtitle:
      "Ship stock out to customers.",
    actionLabel: "Create Delivery",
    quantityLabel: "Quantity to Deliver",
    referenceLabel: "Sales Order Reference",
    referencePlaceholder:
      "Example: SO-2048",
    icon: "arrowUp",
    tone: "delivery",
  },

  TRANSFER: {
    title: "Internal Transfers",
    subtitle:
      "Move stock between warehouses or locations.",
    actionLabel: "Create Transfer",
    quantityLabel: "Quantity to Transfer",
    referenceLabel: "Transfer Reference",
    referencePlaceholder:
      "Example: TRF-1004",
    icon: "transfer",
    tone: "transfer",
  },

  ADJUSTMENT: {
    title: "Inventory Adjustments",
    subtitle:
      "Reconcile recorded stock with the physical count.",
    actionLabel: "Apply Adjustment",
    quantityLabel: "Counted Quantity",
    referenceLabel: "Reason for Adjustment",
    referencePlaceholder:
      "Example: Damaged stock / Physical count",
    icon: "adjustment",
    tone: "adjustment",
  },
};

export default function MovementPage({
  type = "RECEIPT",
  showLocations = false,
}) {
  const config = CONFIG[type] || CONFIG.RECEIPT;

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [reference, setReference] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) =>
        String(product.id) === String(productId)
    );
  }, [products, productId]);

  const numericQuantity =
    Number(quantity || 0);

  const currentStock = selectedProduct
    ? Number(selectedProduct.stock || 0)
    : 0;

  const projectedStock =
    type === "RECEIPT"
      ? currentStock + numericQuantity
      : type === "DELIVERY"
      ? currentStock - numericQuantity
      : type === "ADJUSTMENT"
      ? numericQuantity
      : currentStock;

  async function loadProducts() {
    setLoadingProducts(true);
    setError("");

    try {
      const { response, data } =
        await api("/products");

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to load products."
        );
        return;
      }

      setProducts(data || []);
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    setProductId("");
    setQuantity("");
    setFromLocation("");
    setToLocation("");
    setReference("");
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!productId) {
      setError("Select a product.");
      return;
    }

    if (
      type !== "ADJUSTMENT" &&
      numericQuantity <= 0
    ) {
      setError(
        "Quantity must be greater than zero."
      );
      return;
    }

    if (
      type === "ADJUSTMENT" &&
      numericQuantity < 0
    ) {
      setError(
        "Counted quantity cannot be negative."
      );
      return;
    }

    if (
      type === "DELIVERY" &&
      numericQuantity > currentStock
    ) {
      setError(
        `Insufficient stock. Available stock is ${currentStock} ${selectedProduct?.uom || "units"}.`
      );
      return;
    }

    if (
      type === "TRANSFER" &&
      (!fromLocation.trim() ||
        !toLocation.trim())
    ) {
      setError(
        "Enter both the source and destination locations."
      );
      return;
    }

    if (
      type === "TRANSFER" &&
      fromLocation.trim().toLowerCase() ===
        toLocation.trim().toLowerCase()
    ) {
      setError(
        "Source and destination locations must be different."
      );
      return;
    }

    if (!reference.trim()) {
      setError(
        `${config.referenceLabel} is required.`
      );
      return;
    }

    setSubmitting(true);

    try {
      const { response, data } =
        await api("/movements", {
          method: "POST",
          body: JSON.stringify({
            productId: Number(productId),
            type,
            quantity: numericQuantity,
            fromLocation:
              showLocations
                ? fromLocation.trim()
                : null,
            toLocation:
              showLocations
                ? toLocation.trim()
                : null,
            reference:
              reference.trim(),
          }),
        });

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to record movement."
        );
        return;
      }

      setMessage(
        `${config.title} completed successfully.`
      );

      await loadProducts();

      setQuantity("");
      setReference("");

      if (type === "TRANSFER") {
        setFromLocation("");
        setToLocation("");
      }
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell
      title={config.title}
      subtitle={config.subtitle}
    >
      <div className="movement-page">

        <div className="movement-header">

          <div className="movement-heading">

            <div
              className={`movement-heading-icon ${config.tone}`}
            >
              <Icon
                name={config.icon}
                size={20}
              />
            </div>

            <div>
              <h2>
                {config.title}
              </h2>

              <p>
                {config.subtitle}
              </p>
            </div>

          </div>

          <button
            className="movement-refresh-button"
            onClick={loadProducts}
            title="Refresh products"
          >
            <Icon
              name="refresh"
              size={17}
            />
          </button>

        </div>

        <div className="movement-content">

          <form
            className="movement-card"
            onSubmit={handleSubmit}
          >

            <div className="movement-card-header">

              <div>
                <h3>
                  New{" "}
                  {type === "RECEIPT"
                    ? "Receipt"
                    : type === "DELIVERY"
                    ? "Delivery Order"
                    : type === "TRANSFER"
                    ? "Internal Transfer"
                    : "Inventory Adjustment"}
                </h3>

                <p>
                  Enter the stock movement details
                  below.
                </p>
              </div>

            </div>

            <div className="movement-form">

              <div className="movement-field movement-field-full">

                <label>
                  Product
                  <span>Required</span>
                </label>

                <select
                  value={productId}
                  onChange={(event) =>
                    setProductId(
                      event.target.value
                    )
                  }
                  disabled={loadingProducts}
                >
                  <option value="">
                    {loadingProducts
                      ? "Loading products..."
                      : "Select product"}
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} —{" "}
                        {product.sku}
                      </option>
                    )
                  )}
                </select>

                {selectedProduct && (
                  <div className="movement-product-info">

                    <div>
                      <span>
                        Current stock
                      </span>

                      <strong>
                        {currentStock}{" "}
                        {selectedProduct.uom}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Reorder point
                      </span>

                      <strong>
                        {selectedProduct.min_stock}{" "}
                        {selectedProduct.uom}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Category
                      </span>

                      <strong>
                        {selectedProduct.category}
                      </strong>
                    </div>

                  </div>
                )}

              </div>

              {showLocations && (
                <>
                  <div className="movement-field">

                    <label>
                      From Location
                      <span>Required</span>
                    </label>

                    <div className="movement-location-input">

                      <Icon
                        name="warehouse"
                        size={15}
                      />

                      <input
                        value={fromLocation}
                        onChange={(event) =>
                          setFromLocation(
                            event.target.value
                          )
                        }
                        placeholder="Example: Main Warehouse"
                      />

                    </div>

                  </div>

                  <div className="movement-field">

                    <label>
                      To Location
                      <span>Required</span>
                    </label>

                    <div className="movement-location-input">

                      <Icon
                        name="warehouse"
                        size={15}
                      />

                      <input
                        value={toLocation}
                        onChange={(event) =>
                          setToLocation(
                            event.target.value
                          )
                        }
                        placeholder="Example: Production Floor"
                      />

                    </div>

                  </div>
                </>
              )}

              <div className="movement-field">

                <label>
                  {config.quantityLabel}
                  <span>Required</span>
                </label>

                <div className="movement-quantity-input">

                  <input
                    type="number"
                    min={
                      type === "ADJUSTMENT"
                        ? "0"
                        : "0.01"
                    }
                    step="0.01"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        event.target.value
                      )
                    }
                    placeholder="0"
                  />

                  <span>
                    {selectedProduct?.uom ||
                      "units"}
                  </span>

                </div>

              </div>

              <div className="movement-field">

                <label>
                  {config.referenceLabel}
                  <span>Required</span>
                </label>

                <input
                  value={reference}
                  onChange={(event) =>
                    setReference(
                      event.target.value
                    )
                  }
                  placeholder={
                    config.referencePlaceholder
                  }
                />

              </div>

              {type === "ADJUSTMENT" &&
                selectedProduct && (
                  <div className="movement-field-full">

                    <div className="movement-adjustment-preview">

                      <div>
                        <span>
                          Recorded Stock
                        </span>

                        <strong>
                          {currentStock}{" "}
                          {selectedProduct.uom}
                        </strong>
                      </div>

                      <div className="movement-preview-arrow">
                        →
                      </div>

                      <div>
                        <span>
                          Physical Count
                        </span>

                        <strong>
                          {numericQuantity}{" "}
                          {selectedProduct.uom}
                        </strong>
                      </div>

                      <div className="movement-difference">
                        <span>
                          Difference
                        </span>

                        <strong
                          className={
                            numericQuantity -
                              currentStock <
                            0
                              ? "negative"
                              : numericQuantity -
                                  currentStock >
                                0
                              ? "positive"
                              : ""
                          }
                        >
                          {numericQuantity -
                            currentStock >
                          0
                            ? "+"
                            : ""}
                          {numericQuantity -
                            currentStock}{" "}
                          {selectedProduct.uom}
                        </strong>
                      </div>

                    </div>

                  </div>
                )}

              {type !== "ADJUSTMENT" &&
                selectedProduct &&
                quantity && (
                  <div className="movement-field-full">

                    <div className="movement-stock-preview">

                      <div>
                        <span>
                          Current stock
                        </span>

                        <strong>
                          {currentStock}{" "}
                          {selectedProduct.uom}
                        </strong>
                      </div>

                      <div className="movement-preview-arrow">
                        →
                      </div>

                      <div>
                        <span>
                          After movement
                        </span>

                        <strong
                          className={
                            projectedStock < 0
                              ? "negative"
                              : projectedStock <=
                                Number(
                                  selectedProduct.min_stock ||
                                    0
                                )
                              ? "warning"
                              : "positive"
                          }
                        >
                          {projectedStock}{" "}
                          {selectedProduct.uom}
                        </strong>
                      </div>

                    </div>

                  </div>
                )}

              {error && (
                <div className="movement-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="movement-success">
                  <Icon
                    name="check"
                    size={16}
                  />

                  {message}
                </div>
              )}

            </div>

            <div className="movement-footer">

              <button
                type="button"
                className="movement-reset-button"
                onClick={resetForm}
              >
                Reset
              </button>

              <button
                type="submit"
                className={`movement-submit-button ${config.tone}`}
                disabled={
                  submitting ||
                  loadingProducts
                }
              >
                {submitting
                  ? "Processing..."
                  : config.actionLabel}
              </button>

            </div>

          </form>

          <div className="movement-help-card">

            <div className="movement-help-icon">
              <Icon
                name="package"
                size={20}
              />
            </div>

            <h3>
              {type === "RECEIPT"
                ? "Incoming stock"
                : type === "DELIVERY"
                ? "Outgoing stock"
                : type === "TRANSFER"
                ? "Internal movement"
                : "Stock reconciliation"}
            </h3>

            <p>
              {type === "RECEIPT"
                ? "Use a receipt when goods arrive from a supplier. Validating the movement increases product stock."
                : type === "DELIVERY"
                ? "Use a delivery order when goods leave inventory. The system prevents delivery quantities greater than available stock."
                : type === "TRANSFER"
                ? "Use an internal transfer to record stock moving between locations. Total product stock remains unchanged."
                : "Use an adjustment when the physical count differs from the recorded quantity. The entered count becomes the new stock value."}
            </p>

            <div className="movement-help-rule">

              <span>Current stock</span>

              <strong>
                {selectedProduct
                  ? `${currentStock} ${selectedProduct.uom}`
                  : "Select a product"}
              </strong>

            </div>

          </div>

        </div>

      </div>
    </Shell>
  );
}
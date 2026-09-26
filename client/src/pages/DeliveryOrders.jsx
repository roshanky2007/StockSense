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
    truck: (
      <svg {...common}>
        <path d="M3 6h11v11H3z" />
        <path d="M14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
      </svg>
    ),

    package: (
      <svg {...common}>
        <path d="M3 7.5 12 3l9 4.5L12 12 3 7.5Z" />
        <path d="M3 7.5V17l9 4 9-4V7.5" />
        <path d="M12 12v9" />
      </svg>
    ),

    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),

    arrowRight: (
      <svg {...common}>
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),

    warehouse: (
      <svg {...common}>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
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
  };

  return icons[name] || null;
}

export default function DeliveryOrders() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState(1);

  const [customer, setCustomer] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [salesOrder, setSalesOrder] = useState("");

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProducts() {
    setLoadingProducts(true);

    try {
      const { response, data } =
        await api("/products");

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to load inventory."
        );
        return;
      }

      setProducts(data || []);
    } catch {
      setError(
        "Unable to connect to the inventory server."
      );
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) =>
        String(product.id) ===
        String(productId)
    );
  }, [products, productId]);

  const availableStock = selectedProduct
    ? Number(selectedProduct.stock || 0)
    : 0;

  const deliveryQuantity =
    Number(quantity || 0);

  const remainingStock =
    availableStock - deliveryQuantity;

  function resetForm() {
    setStep(1);
    setCustomer("");
    setWarehouse("");
    setSalesOrder("");
    setProductId("");
    setQuantity("");
    setError("");
    setSuccess("");
  }

  function continueToReview(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!customer.trim()) {
      setError(
        "Enter the customer or destination first."
      );
      return;
    }

    if (!warehouse.trim()) {
      setError(
        "Select the warehouse/location from which the stock will be delivered."
      );
      return;
    }

    if (!productId) {
      setError(
        "Select the product being shipped."
      );
      return;
    }

    if (deliveryQuantity <= 0) {
      setError(
        "Enter a delivery quantity greater than zero."
      );
      return;
    }

    if (
      deliveryQuantity >
      availableStock
    ) {
      setError(
        `Only ${availableStock} ${selectedProduct?.uom || "units"} are available.`
      );
      return;
    }

    setStep(2);
  }

  async function confirmDelivery() {
    setError("");
    setSubmitting(true);

    try {
      const { response, data } =
        await api("/movements", {
          method: "POST",
          body: JSON.stringify({
            productId: Number(productId),
            type: "DELIVERY",
            quantity: deliveryQuantity,
            fromLocation:
              warehouse.trim(),
            toLocation:
              customer.trim(),
            reference:
              salesOrder.trim() ||
              "Delivery Order",
          }),
        });

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to complete delivery."
        );
        setSubmitting(false);
        return;
      }

      setSuccess(
        `Delivery completed. ${deliveryQuantity} ${selectedProduct?.uom || "units"} of ${selectedProduct?.name} were removed from stock.`
      );

      await loadProducts();

      setStep(3);
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const stepClass = (number) => {
    if (step === number) {
      return "active";
    }

    if (step > number) {
      return "completed";
    }

    return "";
  };

  return (
    <Shell
      title="Delivery Orders"
      subtitle="Prepare, review and confirm outgoing stock."
    >
      <div className="delivery-page">

        {/* HEADER */}

        <div className="delivery-header">

          <div className="delivery-title">

            <div className="delivery-title-icon">
              <Icon
                name="truck"
                size={20}
              />
            </div>

            <div>
              <h2>New Delivery Order</h2>

              <p>
                Ship inventory to a customer or
                destination.
              </p>
            </div>

          </div>

          <button
            className="delivery-refresh"
            onClick={loadProducts}
            title="Refresh inventory"
          >
            <Icon
              name="refresh"
              size={17}
            />
          </button>

        </div>

        {/* STEPPER */}

        <div className="delivery-stepper">

          <Step
            number={1}
            title="Prepare"
            description="Enter shipment details"
            className={stepClass(1)}
          />

          <div className="delivery-step-line" />

          <Step
            number={2}
            title="Review"
            description="Check stock impact"
            className={stepClass(2)}
          />

          <div className="delivery-step-line" />

          <Step
            number={3}
            title="Confirmed"
            description="Stock updated"
            className={stepClass(3)}
          />

        </div>

        {/* SUCCESS */}

        {success && (
          <div className="delivery-success">

            <div className="delivery-success-icon">
              <Icon
                name="check"
                size={18}
              />
            </div>

            <div>
              <strong>
                Delivery completed
              </strong>

              <span>
                {success}
              </span>
            </div>

          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="delivery-error">
            {error}
          </div>
        )}

        {/* STEP 1 */}

        {step === 1 && (
          <form
            className="delivery-layout"
            onSubmit={continueToReview}
          >

            <div className="delivery-card">

              <div className="delivery-card-header">

                <div>
                  <h3>
                    Shipment details
                  </h3>

                  <p>
                    Tell us where the stock is going
                    and what is being shipped.
                  </p>
                </div>

                <div className="delivery-card-number">
                  01
                </div>

              </div>

              <div className="delivery-form-grid">

                <Field
                  label="Customer / Destination"
                  required
                  value={customer}
                  onChange={setCustomer}
                  placeholder="Example: ABC Retail Store"
                  full
                />

                <Field
                  label="Warehouse / Source"
                  required
                  value={warehouse}
                  onChange={setWarehouse}
                  placeholder="Example: Main Warehouse"
                />

                <Field
                  label="Sales Order"
                  value={salesOrder}
                  onChange={setSalesOrder}
                  placeholder="Example: SO-1042"
                />

                <div className="delivery-field full">

                  <label>
                    Product
                    <span>Required</span>
                  </label>

                  <select
                    value={productId}
                    onChange={(event) => {
                      setProductId(
                        event.target.value
                      );
                      setQuantity("");
                    }}
                    disabled={
                      loadingProducts
                    }
                  >
                    <option value="">
                      {loadingProducts
                        ? "Loading inventory..."
                        : "Select the product to ship"}
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

                </div>

                {selectedProduct && (
                  <div className="delivery-stock-panel full">

                    <div className="delivery-stock-item">

                      <span>
                        Current stock
                      </span>

                      <strong>
                        {availableStock}{" "}
                        {selectedProduct.uom}
                      </strong>

                    </div>

                    <div className="delivery-stock-item">

                      <span>
                        Minimum stock
                      </span>

                      <strong>
                        {selectedProduct.min_stock}{" "}
                        {selectedProduct.uom}
                      </strong>

                    </div>

                    <div className="delivery-stock-item">

                      <span>
                        Reorder quantity
                      </span>

                      <strong>
                        {selectedProduct.reorder_qty ||
                          "—"}{" "}
                        {selectedProduct.uom}
                      </strong>

                    </div>

                  </div>
                )}

                <div className="delivery-field">

                  <label>
                    Quantity to Deliver
                    <span>Required</span>
                  </label>

                  <div className="delivery-quantity">

                    <input
                      type="number"
                      min="0.01"
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

                <div className="delivery-field">

                  <label>
                    Stock After Delivery
                  </label>

                  <div
                    className={`delivery-after-stock ${
                      selectedProduct
                        ? remainingStock <=
                          Number(
                            selectedProduct.min_stock ||
                              0
                          )
                          ? "warning"
                          : "healthy"
                        : ""
                    }`}
                  >
                    {selectedProduct
                      ? `${Math.max(
                          remainingStock,
                          0
                        )} ${
                          selectedProduct.uom
                        }`
                      : "Select product"}
                  </div>

                </div>

              </div>

              <div className="delivery-card-footer">

                <button
                  type="button"
                  className="delivery-secondary"
                  onClick={resetForm}
                >
                  Reset
                </button>

                <button
                  type="submit"
                  className="delivery-primary"
                >
                  Review Delivery
                  <Icon
                    name="arrowRight"
                    size={15}
                  />
                </button>

              </div>

            </div>

            <DeliveryHelp />

          </form>
        )}

        {/* STEP 2 */}

        {step === 2 && (
          <div className="delivery-layout">

            <div className="delivery-card">

              <div className="delivery-card-header">

                <div>
                  <h3>
                    Review delivery
                  </h3>

                  <p>
                    Check the details before
                    stock is deducted.
                  </p>
                </div>

                <div className="delivery-card-number">
                  02
                </div>

              </div>

              <div className="delivery-review">

                <ReviewRow
                  label="Customer / Destination"
                  value={customer}
                />

                <ReviewRow
                  label="Warehouse"
                  value={warehouse}
                />

                <ReviewRow
                  label="Sales Order"
                  value={
                    salesOrder || "Not provided"
                  }
                />

                <ReviewRow
                  label="Product"
                  value={
                    selectedProduct
                      ? `${selectedProduct.name} (${selectedProduct.sku})`
                      : "—"
                  }
                />

                <ReviewRow
                  label="Quantity"
                  value={
                    `${deliveryQuantity} ${
                      selectedProduct?.uom ||
                      "units"
                    }`
                  }
                />

              </div>

              <div className="delivery-impact">

                <div>
                  <span>
                    Current stock
                  </span>

                  <strong>
                    {availableStock}{" "}
                    {selectedProduct?.uom}
                  </strong>
                </div>

                <div className="delivery-impact-arrow">
                  <Icon
                    name="arrowRight"
                    size={19}
                  />
                </div>

                <div>
                  <span>
                    After delivery
                  </span>

                  <strong
                    className={
                      remainingStock <=
                      Number(
                        selectedProduct?.min_stock ||
                          0
                      )
                        ? "warning"
                        : "healthy"
                    }
                  >
                    {remainingStock}{" "}
                    {selectedProduct?.uom}
                  </strong>
                </div>

              </div>

              {remainingStock <=
                Number(
                  selectedProduct?.min_stock ||
                    0
                ) && (
                <div className="delivery-reorder-warning">

                  <strong>
                    Reorder point reached
                  </strong>

                  <span>
                    This delivery will bring the
                    product to or below its minimum
                    stock level.
                    {selectedProduct?.reorder_qty
                      ? ` Suggested reorder: ${selectedProduct.reorder_qty} ${selectedProduct.uom}.`
                      : ""}
                  </span>

                </div>
              )}

              <div className="delivery-card-footer">

                <button
                  type="button"
                  className="delivery-secondary"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>

                <button
                  type="button"
                  className="delivery-primary"
                  onClick={confirmDelivery}
                  disabled={submitting}
                >
                  {submitting
                    ? "Confirming..."
                    : "Confirm Delivery"}
                  <Icon
                    name="check"
                    size={15}
                  />
                </button>

              </div>

            </div>

            <DeliveryHelp />

          </div>
        )}

        {/* STEP 3 */}

        {step === 3 && (
          <div className="delivery-complete">

            <div className="delivery-complete-icon">
              <Icon
                name="check"
                size={28}
              />
            </div>

            <h2>
              Delivery completed
            </h2>

            <p>
              The delivery has been recorded and
              the inventory has been updated.
            </p>

            <div className="delivery-complete-summary">

              <div>
                <span>
                  Product
                </span>

                <strong>
                  {selectedProduct?.name}
                </strong>
              </div>

              <div>
                <span>
                  Quantity delivered
                </span>

                <strong>
                  {deliveryQuantity}{" "}
                  {selectedProduct?.uom}
                </strong>
              </div>

              <div>
                <span>
                  Remaining stock
                </span>

                <strong>
                  {remainingStock}{" "}
                  {selectedProduct?.uom}
                </strong>
              </div>

            </div>

            <div className="delivery-complete-actions">

              <button
                className="delivery-secondary"
                onClick={resetForm}
              >
                Create Another Delivery
              </button>

              <a
                href="/operations/move-history"
                className="delivery-primary"
              >
                View Move History
                <Icon
                  name="arrowRight"
                  size={15}
                />
              </a>

            </div>

          </div>
        )}

      </div>
    </Shell>
  );
}

function Step({
  number,
  title,
  description,
  className,
}) {
  return (
    <div className={`delivery-step ${className}`}>

      <div className="delivery-step-number">
        {className === "completed" ? (
          <Icon
            name="check"
            size={14}
          />
        ) : (
          number
        )}
      </div>

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  full = false,
}) {
  return (
    <div
      className={`delivery-field ${
        full ? "full" : ""
      }`}
    >

      <label>
        {label}

        {required && (
          <span>Required</span>
        )}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
      />

    </div>
  );
}

function ReviewRow({
  label,
  value,
}) {
  return (
    <div className="delivery-review-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

function DeliveryHelp() {
  return (
    <aside className="delivery-help">

      <div className="delivery-help-icon">
        <Icon
          name="truck"
          size={19}
        />
      </div>

      <h3>
        How delivery works
      </h3>

      <div className="delivery-help-step">
        <strong>1. Prepare</strong>
        <span>
          Enter the customer, warehouse,
          product and quantity.
        </span>
      </div>

      <div className="delivery-help-step">
        <strong>2. Review</strong>
        <span>
          Check exactly how much stock will
          remain after shipment.
        </span>
      </div>

      <div className="delivery-help-step">
        <strong>3. Confirm</strong>
        <span>
          Confirm the delivery and StockSense
          deducts the quantity automatically.
        </span>
      </div>

    </aside>
  );
}
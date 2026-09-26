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
    receipt: (
      <svg {...common}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
      </svg>
    ),
    plus: (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    search: (
      <svg {...common}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
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
    close: (
      <svg {...common}>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </svg>
    ),
    check: (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    ),
    package: (
      <svg {...common}>
        <path d="M3 7.5 12 3l9 4.5L12 12 3 7.5Z" />
        <path d="M3 7.5V17l9 4 9-4V7.5" />
        <path d="M12 12v9" />
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
    trash: (
      <svg {...common}>
        <path d="M5 7h14" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
        <path d="M8 7l1-3h6l1 3" />
        <path d="M7 7l1 14h8l1-14" />
      </svg>
    ),
    calendar: (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    ),
    warehouse: (
      <svg {...common}>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  };

  return icons[name] || null;
}

const emptyItem = {
  productId: "",
  quantity: "",
};

function Receipts() {
  const [products, setProducts] = useState([]);
  const [receipts, setReceipts] = useState([]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [form, setForm] = useState({
    supplier: "",
    warehouse: "",
    reference: "",
    items: [{ ...emptyItem }],
  });

  const [error, setError] = useState("");

  async function loadData() {
    setPageLoading(true);

    try {
      const [productsResult, receiptsResult] =
        await Promise.all([
          api("/products"),
          api("/receipts"),
        ]);

      if (productsResult.response.ok) {
        setProducts(productsResult.data || []);
      }

      if (receiptsResult.response.ok) {
        setReceipts(receiptsResult.data || []);
      } else {
        setError(
          receiptsResult.data?.message ||
            "Unable to load receipts."
        );
      }
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const thisMonth = receipts.filter((receipt) => {
      const date = new Date(receipt.created_at);

      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    return {
      total: receipts.length,
      draft: receipts.filter(
        (receipt) => receipt.status === "DRAFT"
      ).length,
      validated: receipts.filter(
        (receipt) => receipt.status === "VALIDATED"
      ).length,
      thisMonth,
    };
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receipts.filter((receipt) => {
      const matchesSearch =
        !query ||
        String(receipt.receipt_no || "")
          .toLowerCase()
          .includes(query) ||
        String(receipt.supplier || "")
          .toLowerCase()
          .includes(query) ||
        String(receipt.warehouse || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        receipt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [receipts, search, statusFilter]);

  function openCreate() {
    setForm({
      supplier: "",
      warehouse: "",
      reference: "",
      items: [{ ...emptyItem }],
    });

    setError("");
    setOpen(true);
  }

  function updateHeader(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  }

  function updateItem(index, field, value) {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));

    setError("");
  }

  function addItem() {
    setForm((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        { ...emptyItem },
      ],
    }));
  }

  function removeItem(index) {
    setForm((previous) => {
      if (previous.items.length === 1) {
        return previous;
      }

      return {
        ...previous,
        items: previous.items.filter(
          (_, itemIndex) =>
            itemIndex !== index
        ),
      };
    });
  }

  function getProduct(productId) {
    return products.find(
      (product) =>
        String(product.id) === String(productId)
    );
  }

  const formTotal = form.items.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  async function createReceipt(event) {
    event.preventDefault();
    setError("");

    if (!form.supplier.trim()) {
      setError("Supplier name is required.");
      return;
    }

    if (!form.warehouse.trim()) {
      setError("Warehouse/location is required.");
      return;
    }

    if (form.items.length === 0) {
      setError("Add at least one product.");
      return;
    }

    const seenProducts = new Set();

    for (const item of form.items) {
      if (!item.productId) {
        setError("Select a product for every line.");
        return;
      }

      if (seenProducts.has(String(item.productId))) {
        setError(
          "A product can only appear once in a receipt."
        );
        return;
      }

      seenProducts.add(String(item.productId));

      if (Number(item.quantity) <= 0) {
        setError(
          "Every received quantity must be greater than 0."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const { response, data } = await api(
        "/receipts",
        {
          method: "POST",
          body: JSON.stringify({
            supplier: form.supplier.trim(),
            warehouse: form.warehouse.trim(),
            reference:
              form.reference.trim() || null,
            items: form.items.map((item) => ({
              productId: Number(item.productId),
              quantity: Number(item.quantity),
            })),
          }),
        }
      );

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to create receipt."
        );
        return;
      }

      setOpen(false);
      await loadData();
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  async function validateReceipt(id) {
    const confirmed = window.confirm(
      "Validate this receipt? Stock will increase immediately."
    );

    if (!confirmed) {
      return;
    }

    try {
      const { response, data } =
        await api(
          `/receipts/${id}/validate`,
          {
            method: "POST",
          }
        );

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to validate receipt."
        );
        return;
      }

      await loadData();
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    }
  }

  async function cancelReceipt(id) {
    const confirmed = window.confirm(
      "Cancel this draft receipt?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const { response, data } =
        await api(
          `/receipts/${id}/cancel`,
          {
            method: "POST",
          }
        );

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to cancel receipt."
        );
        return;
      }

      await loadData();
    } catch {
      setError(
        "Unable to connect to the backend."
      );
    }
  }

  return (
    <Shell
      title="Receipts"
      subtitle="Record incoming goods and increase inventory."
    >
      <div className="receipts-page">

        <div className="receipts-header">

          <div className="receipts-heading">

            <div className="receipts-heading-icon">
              <Icon
                name="receipt"
                size={20}
              />
            </div>

            <div>
              <h2>Incoming Stock</h2>
              <p>
                Create receipts for stock received
                from suppliers.
              </p>
            </div>

          </div>

          <div className="receipts-header-actions">

            <button
              className="receipts-icon-button"
              onClick={loadData}
              title="Refresh receipts"
            >
              <Icon
                name="refresh"
                size={17}
              />
            </button>

            <button
              className="receipts-primary-button"
              onClick={openCreate}
            >
              <Icon
                name="plus"
                size={16}
              />
              New Receipt
            </button>

          </div>

        </div>

        <div className="receipts-summary">

          <SummaryCard
            label="Total Receipts"
            value={stats.total}
            tone="neutral"
            icon="receipt"
          />

          <SummaryCard
            label="Draft"
            value={stats.draft}
            tone="warning"
            icon="calendar"
          />

          <SummaryCard
            label="Validated"
            value={stats.validated}
            tone="healthy"
            icon="check"
          />

          <SummaryCard
            label="This Month"
            value={stats.thisMonth}
            tone="neutral"
            icon="truck"
          />

        </div>

        <div className="receipts-filter-bar">

          <div className="receipts-search">

            <Icon
              name="search"
              size={17}
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search receipt, supplier or warehouse..."
            />

          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="VALIDATED">
              Validated
            </option>

            <option value="CANCELED">
              Canceled
            </option>
          </select>

          <button
            className="receipts-reset"
            onClick={() => {
              setSearch("");
              setStatusFilter("ALL");
            }}
          >
            Reset
          </button>

        </div>

        {error && (
          <div className="receipts-page-error">
            {error}
          </div>
        )}

        <div className="receipts-table-card">

          {pageLoading ? (
            <div className="receipts-state">
              <div className="receipts-spinner" />
              <strong>
                Loading receipts
              </strong>
              <span>
                Fetching incoming stock records.
              </span>
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="receipts-state">

              <div className="receipts-empty-icon">
                <Icon
                  name="receipt"
                  size={22}
                />
              </div>

              <strong>
                No receipts found
              </strong>

              <span>
                Create a receipt when stock arrives
                from a supplier.
              </span>

              <button
                className="receipts-primary-button"
                onClick={openCreate}
              >
                <Icon
                  name="plus"
                  size={16}
                />
                Create Receipt
              </button>

            </div>
          ) : (
            <div className="receipts-table-wrap">

              <table className="receipts-table">

                <thead>
                  <tr>
                    <th>RECEIPT</th>
                    <th>SUPPLIER</th>
                    <th>WAREHOUSE</th>
                    <th>ITEMS</th>
                    <th>TOTAL QTY</th>
                    <th>DATE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredReceipts.map(
                    (receipt) => (
                      <tr key={receipt.id}>

                        <td>
                          <div className="receipt-number">
                            {receipt.receipt_no}
                          </div>

                          {receipt.reference && (
                            <span className="receipt-reference">
                              Ref: {receipt.reference}
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>
                            {receipt.supplier}
                          </strong>
                        </td>

                        <td>
                          <div className="receipt-location">
                            <Icon
                              name="warehouse"
                              size={14}
                            />
                            {receipt.warehouse}
                          </div>
                        </td>

                        <td>
                          {receipt.item_count}
                        </td>

                        <td>
                          <strong>
                            {Number(
                              receipt.total_quantity || 0
                            )}
                          </strong>
                        </td>

                        <td>
                          {formatDate(
                            receipt.created_at
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              receipt.status
                            }
                          />
                        </td>

                        <td>
                          {receipt.status ===
                            "DRAFT" && (
                            <div className="receipt-row-actions">

                              <button
                                className="receipt-validate-button"
                                onClick={() =>
                                  validateReceipt(
                                    receipt.id
                                  )
                                }
                              >
                                <Icon
                                  name="check"
                                  size={14}
                                />
                                Validate
                              </button>

                              <button
                                className="receipt-cancel-button"
                                onClick={() =>
                                  cancelReceipt(
                                    receipt.id
                                  )
                                }
                                title="Cancel receipt"
                              >
                                <Icon
                                  name="trash"
                                  size={14}
                                />
                              </button>

                            </div>
                          )}

                          {receipt.status ===
                            "VALIDATED" && (
                            <span className="receipt-done">
                              Stock updated
                            </span>
                          )}

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

      </div>

      {open && (
        <div
          className="receipts-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOpen(false);
            }
          }}
        >

          <div className="receipts-modal">

            <div className="receipts-modal-header">

              <div className="receipts-modal-title">

                <div className="receipts-modal-icon">
                  <Icon
                    name="receipt"
                    size={19}
                  />
                </div>

                <div>
                  <h2>
                    New Receipt
                  </h2>

                  <p>
                    Record incoming goods from a
                    supplier.
                  </p>
                </div>

              </div>

              <button
                className="receipts-close"
                onClick={() => setOpen(false)}
              >
                <Icon
                  name="close"
                  size={18}
                />
              </button>

            </div>

            <form onSubmit={createReceipt}>

              <div className="receipts-modal-body">

                <div className="receipts-form-grid">

                  <div className="receipt-form-field">

                    <label>
                      Supplier
                      <span>Required</span>
                    </label>

                    <input
                      value={form.supplier}
                      onChange={(event) =>
                        updateHeader(
                          "supplier",
                          event.target.value
                        )
                      }
                      placeholder="Example: ABC Steel Suppliers"
                      autoFocus
                    />

                  </div>

                  <div className="receipt-form-field">

                    <label>
                      Warehouse / Location
                      <span>Required</span>
                    </label>

                    <input
                      value={form.warehouse}
                      onChange={(event) =>
                        updateHeader(
                          "warehouse",
                          event.target.value
                        )
                      }
                      placeholder="Example: Main Warehouse"
                    />

                  </div>

                  <div className="receipt-form-field">

                    <label>
                      Supplier Reference
                      <small>Optional</small>
                    </label>

                    <input
                      value={form.reference}
                      onChange={(event) =>
                        updateHeader(
                          "reference",
                          event.target.value
                        )
                      }
                      placeholder="PO-1042 / Vendor invoice"
                    />

                  </div>

                </div>

                <div className="receipts-items-section">

                  <div className="receipts-items-header">

                    <div>
                      <strong>
                        Received Products
                      </strong>

                      <span>
                        Add every product and quantity
                        included in this delivery.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="receipts-add-line"
                      onClick={addItem}
                    >
                      <Icon
                        name="plus"
                        size={15}
                      />
                      Add Product
                    </button>

                  </div>

                  <div className="receipt-lines">

                    {form.items.map(
                      (item, index) => {

                        const product =
                          getProduct(
                            item.productId
                          );

                        const quantity =
                          Number(
                            item.quantity || 0
                          );

                        const projectedStock =
                          product
                            ? Number(
                                product.stock || 0
                              ) + quantity
                            : null;

                        return (
                          <div
                            className="receipt-line"
                            key={index}
                          >

                            <div className="receipt-line-number">
                              {index + 1}
                            </div>

                            <div className="receipt-line-product">

                              <label>
                                Product
                              </label>

                              <select
                                value={
                                  item.productId
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "productId",
                                    event.target.value
                                  )
                                }
                              >
                                <option value="">
                                  Select product
                                </option>

                                {products.map(
                                  (productOption) => (
                                    <option
                                      key={
                                        productOption.id
                                      }
                                      value={
                                        productOption.id
                                      }
                                    >
                                      {
                                        productOption.name
                                      }{" "}
                                      —{" "}
                                      {
                                        productOption.sku
                                      }
                                    </option>
                                  )
                                )}

                              </select>

                              {product && (
                                <small>
                                  Current stock:{" "}
                                  <strong>
                                    {
                                      product.stock
                                    }
                                  </strong>{" "}
                                  {product.uom}
                                </small>
                              )}

                            </div>

                            <div className="receipt-line-quantity">

                              <label>
                                Quantity
                              </label>

                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={
                                  item.quantity
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                                placeholder="0"
                              />

                              {product && (
                                <small>
                                  Unit:{" "}
                                  <strong>
                                    {
                                      product.uom
                                    }
                                  </strong>
                                </small>
                              )}

                            </div>

                            <div className="receipt-line-impact">

                              <span>
                                New stock
                              </span>

                              <strong>
                                {projectedStock ??
                                  "—"}
                              </strong>

                            </div>

                            <button
                              type="button"
                              className="receipt-remove-line"
                              onClick={() =>
                                removeItem(index)
                              }
                              disabled={
                                form.items.length === 1
                              }
                            >
                              <Icon
                                name="trash"
                                size={15}
                              />
                            </button>

                          </div>
                        );
                      }
                    )}

                  </div>

                </div>

                <div className="receipts-total-bar">

                  <div>
                    <span>
                      Total received quantity
                    </span>

                    <strong>
                      {formTotal}
                    </strong>
                  </div>

                  <span>
                    Receipt will remain a draft until
                    validated.
                  </span>

                </div>

                {error && (
                  <div className="receipts-form-error">
                    {error}
                  </div>
                )}

              </div>

              <div className="receipts-modal-footer">

                <button
                  type="button"
                  className="receipts-cancel-button"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="receipts-submit-button"
                  disabled={loading}
                >
                  {loading
                    ? "Creating Receipt..."
                    : "Create Draft Receipt"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </Shell>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}) {
  return (
    <div className="receipts-summary-card">

      <div className={`receipts-summary-icon ${tone}`}>
        <Icon
          name={icon}
          size={18}
        />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: {
      className: "draft",
      label: "Draft",
    },
    VALIDATED: {
      className: "validated",
      label: "Validated",
    },
    CANCELED: {
      className: "canceled",
      label: "Canceled",
    },
  };

  const config =
    map[status] || map.DRAFT;

  return (
    <span
      className={`receipt-status ${config.className}`}
    >
      <span />
      {config.label}
    </span>
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(
    value.replace(" ", "T") + "Z"
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

export default Receipts;

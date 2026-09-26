import express from "express";
import cors from "cors";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const app = express();

const PORT = 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "stocksense_dev_secret";

app.use(cors());
app.use(express.json());

const db = new DatabaseSync("stocksense.db");

db.exec(`PRAGMA foreign_keys = ON;`);

// =====================================================
// DATABASE
// =====================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    uom TEXT NOT NULL,
    stock REAL NOT NULL DEFAULT 0,
    min_stock REAL NOT NULL DEFAULT 0,
    reorder_qty REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    from_location TEXT,
    to_location TEXT,
    reference TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS password_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no TEXT UNIQUE NOT NULL,
    supplier TEXT NOT NULL,
    warehouse TEXT NOT NULL,
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    validated_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    uom TEXT NOT NULL,
    FOREIGN KEY(receipt_id)
      REFERENCES receipts(id)
      ON DELETE CASCADE,
    FOREIGN KEY(product_id)
      REFERENCES products(id)
  );
`);

// =====================================================
// DATABASE MIGRATION
// =====================================================

try {
  db.prepare(`
    ALTER TABLE products
    ADD COLUMN reorder_qty REAL NOT NULL DEFAULT 0
  `).run();
} catch (error) {
  const message = String(error.message || "");

  if (!message.includes("duplicate column name")) {
    console.error(
      "reorder_qty migration error:",
      error
    );
  }
}

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

function authenticate(req, res, next) {
  const authHeader =
    req.headers.authorization || "";

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    req.user = jwt.verify(
      token,
      JWT_SECRET
    );

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "StockSense API is running",
  });
});

// =====================================================
// SIGNUP
// =====================================================

app.post("/api/auth/signup", (req, res) => {
  const {
    name,
    email,
    password,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message:
        "Name, email and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message:
        "Password must be at least 6 characters",
    });
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  try {
    const passwordHash =
      bcrypt.hashSync(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users
        (
          name,
          email,
          password_hash
        )
        VALUES (?, ?, ?)
      `)
      .run(
        name.trim(),
        normalizedEmail,
        passwordHash
      );

    const user = {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: normalizedEmail,
    };

    const token = jwt.sign(
      user,
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch {
    res.status(400).json({
      success: false,
      message:
        "An account with this email already exists",
    });
  }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/auth/login", (req, res) => {
  const {
    email,
    password,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message:
        "Email and password are required",
    });
  }

  const record = db
    .prepare(`
      SELECT *
      FROM users
      WHERE email = ?
    `)
    .get(
      email.trim().toLowerCase()
    );

  if (
    !record ||
    !bcrypt.compareSync(
      password,
      record.password_hash
    )
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid email or password",
    });
  }

  const user = {
    id: record.id,
    name: record.name,
    email: record.email,
  };

  const token = jwt.sign(
    user,
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.json({
    success: true,
    token,
    user,
  });
});

// =====================================================
// FORGOT PASSWORD
// =====================================================

app.post(
  "/api/auth/forgot-password",
  (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = db
      .prepare(`
        SELECT id
        FROM users
        WHERE email = ?
      `)
      .get(normalizedEmail);

    if (!user) {
      return res.json({
        success: true,
        message:
          "If the account exists, an OTP has been generated.",
      });
    }

    const otp = String(
      crypto.randomInt(
        100000,
        999999
      )
    );

    const otpHash =
      bcrypt.hashSync(otp, 10);

    db.prepare(`
      INSERT INTO password_otps
      (
        email,
        otp_hash,
        expires_at
      )
      VALUES (?, ?, ?)
    `).run(
      normalizedEmail,
      otpHash,
      Date.now() + 10 * 60 * 1000
    );

    console.log(
      `Password reset OTP for ${normalizedEmail}: ${otp}`
    );

    res.json({
      success: true,
      message: "OTP generated successfully",
      devOtp: otp,
    });
  }
);

// =====================================================
// RESET PASSWORD
// =====================================================

app.post(
  "/api/auth/reset-password",
  (req, res) => {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (
      !email ||
      !otp ||
      !newPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const record = db
      .prepare(`
        SELECT *
        FROM password_otps
        WHERE email = ?
          AND used = 0
        ORDER BY id DESC
        LIMIT 1
      `)
      .get(normalizedEmail);

    if (!record) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired OTP",
      });
    }

    if (
      record.expires_at < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "OTP has expired",
      });
    }

    const validOtp =
      bcrypt.compareSync(
        String(otp),
        record.otp_hash
      );

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid OTP",
      });
    }

    const passwordHash =
      bcrypt.hashSync(
        newPassword,
        10
      );

    db.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE email = ?
    `).run(
      passwordHash,
      normalizedEmail
    );

    db.prepare(`
      UPDATE password_otps
      SET used = 1
      WHERE id = ?
    `).run(record.id);

    res.json({
      success: true,
      message:
        "Password reset successfully",
    });
  }
);

// =====================================================
// CURRENT USER
// =====================================================

app.get(
  "/api/me",
  authenticate,
  (req, res) => {
    const user = db
      .prepare(`
        SELECT
          id,
          name,
          email,
          created_at
        FROM users
        WHERE id = ?
      `)
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json(user);
  }
);

// =====================================================
// PRODUCTS - GET
// =====================================================

app.get(
  "/api/products",
  authenticate,
  (req, res) => {
    try {
      const products = db
        .prepare(`
          SELECT
            id,
            name,
            sku,
            category,
            uom,
            stock,
            min_stock,
            reorder_qty,
            created_at
          FROM products
          ORDER BY id DESC
        `)
        .all();

      res.json(products);
    } catch (error) {
      console.error(
        "Get products error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load products",
      });
    }
  }
);

// =====================================================
// PRODUCTS - CREATE
// =====================================================

app.post(
  "/api/products",
  authenticate,
  (req, res) => {
    const {
      name,
      sku,
      category,
      uom,
      stock = 0,
      min_stock = 0,
      reorder_qty = 0,
    } = req.body;

    if (
      !name ||
      !sku ||
      !category ||
      !uom
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, SKU, category and UoM are required",
      });
    }

    const initialStock =
      Number(stock);

    const minimumStock =
      Number(min_stock);

    const reorderQuantity =
      Number(reorder_qty);

    if (
      !Number.isFinite(initialStock) ||
      !Number.isFinite(minimumStock) ||
      !Number.isFinite(reorderQuantity)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock values must be valid numbers",
      });
    }

    if (
      initialStock < 0 ||
      minimumStock < 0 ||
      reorderQuantity < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock values cannot be negative",
      });
    }

    try {
      const result = db
        .prepare(`
          INSERT INTO products
          (
            name,
            sku,
            category,
            uom,
            stock,
            min_stock,
            reorder_qty
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          name.trim(),
          sku.trim().toUpperCase(),
          category.trim(),
          uom.trim(),
          initialStock,
          minimumStock,
          reorderQuantity
        );

      const product = db
        .prepare(`
          SELECT *
          FROM products
          WHERE id = ?
        `)
        .get(
          result.lastInsertRowid
        );

      res.status(201).json({
        success: true,
        message:
          "Product created successfully",
        product,
      });
    } catch (error) {
      const message =
        String(error.message || "");

      if (
        message.includes(
          "UNIQUE constraint failed"
        )
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A product with this SKU already exists",
        });
      }

      console.error(
        "Product creation error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to create product",
      });
    }
  }
);

// =====================================================
// RECEIPTS - GET ALL
// =====================================================

app.get(
  "/api/receipts",
  authenticate,
  (req, res) => {
    try {
      const receipts = db
        .prepare(`
          SELECT
            r.*,
            COUNT(ri.id) AS item_count,
            COALESCE(
              SUM(ri.quantity),
              0
            ) AS total_quantity
          FROM receipts r
          LEFT JOIN receipt_items ri
            ON ri.receipt_id = r.id
          GROUP BY r.id
          ORDER BY r.id DESC
        `)
        .all();

      res.json(receipts);
    } catch (error) {
      console.error(
        "Get receipts error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load receipts",
      });
    }
  }
);

// =====================================================
// RECEIPTS - GET ONE
// =====================================================

app.get(
  "/api/receipts/:id",
  authenticate,
  (req, res) => {
    try {
      const receiptId =
        Number(req.params.id);

      const receipt = db
        .prepare(`
          SELECT *
          FROM receipts
          WHERE id = ?
        `)
        .get(receiptId);

      if (!receipt) {
        return res.status(404).json({
          success: false,
          message:
            "Receipt not found",
        });
      }

      const items = db
        .prepare(`
          SELECT
            ri.*,
            p.name AS product_name,
            p.sku,
            p.category
          FROM receipt_items ri
          JOIN products p
            ON p.id = ri.product_id
          WHERE ri.receipt_id = ?
          ORDER BY ri.id
        `)
        .all(receiptId);

      res.json({
        success: true,
        receipt,
        items,
      });
    } catch (error) {
      console.error(
        "Get receipt error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load receipt",
      });
    }
  }
);

// =====================================================
// RECEIPTS - CREATE DRAFT
// =====================================================

app.post(
  "/api/receipts",
  authenticate,
  (req, res) => {
    const {
      supplier,
      warehouse,
      reference = null,
      items,
    } = req.body;

    if (
      !supplier ||
      !warehouse
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Supplier and warehouse/location are required",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one product is required",
      });
    }

    const seenProducts =
      new Set();

    for (const item of items) {
      const productId =
        Number(item.productId);

      const quantity =
        Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Every receipt line must have a valid product",
        });
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Every receipt quantity must be greater than zero",
        });
      }

      if (
        seenProducts.has(productId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A product can only appear once in a receipt",
        });
      }

      seenProducts.add(productId);

      const product = db
        .prepare(`
          SELECT id, uom
          FROM products
          WHERE id = ?
        `)
        .get(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "One of the selected products was not found",
        });
      }
    }

    const receiptNo =
      `RCV-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${Date.now()
        .toString()
        .slice(-6)}`;

    try {
      db.exec("BEGIN");

      const receiptResult =
        db.prepare(`
          INSERT INTO receipts
          (
            receipt_no,
            supplier,
            warehouse,
            reference,
            status
          )
          VALUES (?, ?, ?, ?, 'DRAFT')
        `).run(
          receiptNo,
          supplier.trim(),
          warehouse.trim(),
          reference?.trim() || null
        );

      const receiptId =
        Number(
          receiptResult.lastInsertRowid
        );

      const insertItem =
        db.prepare(`
          INSERT INTO receipt_items
          (
            receipt_id,
            product_id,
            quantity,
            uom
          )
          SELECT
            ?,
            id,
            ?,
            uom
          FROM products
          WHERE id = ?
        `);

      for (const item of items) {
        insertItem.run(
          receiptId,
          Number(item.quantity),
          Number(item.productId)
        );
      }

      db.exec("COMMIT");

      const receipt =
        db.prepare(`
          SELECT
            r.*,
            COUNT(ri.id) AS item_count,
            COALESCE(
              SUM(ri.quantity),
              0
            ) AS total_quantity
          FROM receipts r
          LEFT JOIN receipt_items ri
            ON ri.receipt_id = r.id
          WHERE r.id = ?
          GROUP BY r.id
        `).get(receiptId);

      res.status(201).json({
        success: true,
        message:
          "Draft receipt created",
        receipt,
      });
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {}

      console.error(
        "Create receipt error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to create receipt",
      });
    }
  }
);

// =====================================================
// RECEIPTS - VALIDATE
// =====================================================

app.post(
  "/api/receipts/:id/validate",
  authenticate,
  (req, res) => {
    const receiptId =
      Number(req.params.id);

    const receipt = db
      .prepare(`
        SELECT *
        FROM receipts
        WHERE id = ?
      `)
      .get(receiptId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message:
          "Receipt not found",
      });
    }

    if (
      receipt.status !== "DRAFT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft receipts can be validated",
      });
    }

    const items = db
      .prepare(`
        SELECT
          ri.*,
          p.name AS product_name
        FROM receipt_items ri
        JOIN products p
          ON p.id = ri.product_id
        WHERE ri.receipt_id = ?
        ORDER BY ri.id
      `)
      .all(receiptId);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "This receipt has no product lines",
      });
    }

    try {
      db.exec("BEGIN");

      const updateProduct =
        db.prepare(`
          UPDATE products
          SET stock = stock + ?
          WHERE id = ?
        `);

      const insertMovement =
        db.prepare(`
          INSERT INTO movements
          (
            product_id,
            type,
            quantity,
            from_location,
            to_location,
            reference
          )
          VALUES (?, 'RECEIPT', ?, NULL, ?, ?)
        `);

      for (const item of items) {
        updateProduct.run(
          Number(item.quantity),
          Number(item.product_id)
        );

        insertMovement.run(
          Number(item.product_id),
          Number(item.quantity),
          receipt.warehouse,
          receipt.receipt_no
        );
      }

      db.prepare(`
        UPDATE receipts
        SET
          status = 'VALIDATED',
          validated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(receiptId);

      db.exec("COMMIT");

      res.json({
        success: true,
        message:
          "Receipt validated and stock updated",
      });
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {}

      console.error(
        "Validate receipt error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to validate receipt",
      });
    }
  }
);

// =====================================================
// RECEIPTS - CANCEL
// =====================================================

app.post(
  "/api/receipts/:id/cancel",
  authenticate,
  (req, res) => {
    const receiptId =
      Number(req.params.id);

    const receipt = db
      .prepare(`
        SELECT
          id,
          status
        FROM receipts
        WHERE id = ?
      `)
      .get(receiptId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message:
          "Receipt not found",
      });
    }

    if (
      receipt.status !== "DRAFT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only draft receipts can be canceled",
      });
    }

    db.prepare(`
      UPDATE receipts
      SET status = 'CANCELED'
      WHERE id = ?
    `).run(receiptId);

    res.json({
      success: true,
      message:
        "Receipt canceled",
    });
  }
);

// =====================================================
// DASHBOARD
// =====================================================

app.get(
  "/api/dashboard",
  authenticate,
  (req, res) => {
    try {
      const totalProducts =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM products
        `).get().count;

      const totalStock =
        db.prepare(`
          SELECT
            COALESCE(
              SUM(stock),
              0
            ) AS total
          FROM products
        `).get().total;

      const lowStock =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM products
          WHERE
            stock > 0
            AND stock <= min_stock
        `).get().count;

      const outOfStock =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM products
          WHERE stock <= 0
        `).get().count;

      const reorderRequired =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM products
          WHERE
            stock <= min_stock
            AND reorder_qty > 0
        `).get().count;

      const pendingReceipts =
        db.prepare(`
          SELECT COUNT(*) AS count
          FROM receipts
          WHERE status = 'DRAFT'
        `).get().count;

      const recentMovements =
        db.prepare(`
          SELECT
            movements.*,
            products.name AS product_name,
            products.sku,
            products.uom
          FROM movements
          JOIN products
            ON products.id =
               movements.product_id
          ORDER BY movements.id DESC
          LIMIT 10
        `).all();

      res.json({
        totalProducts,
        totalStock,
        lowStock,
        outOfStock,
        reorderRequired,
        pendingReceipts,
        pendingDeliveries: 0,
        scheduledTransfers: 0,
        recentMovements,
      });
    } catch (error) {
      console.error(
        "Dashboard error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load dashboard",
      });
    }
  }
);

// =====================================================
// STOCK MOVEMENTS
// =====================================================

app.post(
  "/api/movements",
  authenticate,
  (req, res) => {
    const {
      productId,
      type,
      quantity,
      fromLocation = null,
      toLocation = null,
      reference = null,
    } = req.body;

    const product = db
      .prepare(`
        SELECT *
        FROM products
        WHERE id = ?
      `)
      .get(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    const qty =
      Number(quantity);

    if (
      !Number.isFinite(qty) ||
      qty < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be zero or greater",
      });
    }

    if (
      qty === 0 &&
      type !== "ADJUSTMENT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be greater than 0",
      });
    }

    let newStock =
      Number(product.stock);

    if (type === "RECEIPT") {
      newStock += qty;
    } else if (
      type === "DELIVERY"
    ) {
      newStock -= qty;
    } else if (
      type === "ADJUSTMENT"
    ) {
      newStock = qty;
    } else if (
      type === "TRANSFER"
    ) {
      newStock =
        Number(product.stock);
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid movement type",
      });
    }

    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Insufficient stock",
      });
    }

    try {
      db.exec("BEGIN");

      db.prepare(`
        UPDATE products
        SET stock = ?
        WHERE id = ?
      `).run(
        newStock,
        productId
      );

      db.prepare(`
        INSERT INTO movements
        (
          product_id,
          type,
          quantity,
          from_location,
          to_location,
          reference
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        type,
        qty,
        fromLocation,
        toLocation,
        reference
      );

      db.exec("COMMIT");

      res.json({
        success: true,
        message:
          `${type} completed`,
        stock: newStock,
      });
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {}

      console.error(
        "Movement error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to record this movement",
      });
    }
  }
);

// =====================================================
// MOVEMENT HISTORY
// =====================================================

app.get(
  "/api/movements",
  authenticate,
  (req, res) => {
    try {
      const movements =
        db.prepare(`
          SELECT
            movements.*,
            products.name AS product_name,
            products.sku,
            products.uom
          FROM movements
          JOIN products
            ON products.id =
               movements.product_id
          ORDER BY movements.id DESC
        `).all();

      res.json(movements);
    } catch (error) {
      console.error(
        "Movement history error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load movement history",
      });
    }
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {
    console.log(
      `StockSense backend running on http://localhost:${PORT}`
    );
  }
);
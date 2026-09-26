# StockSense – Inventory Management System.

StockSense is a modular Inventory Management System (IMS) designed to digitize and streamline stock-related operations within a business..

The system provides centralized inventory management instead of relying on manual registers, spreadsheets, and scattered tracking methods.

## Features!

### Authentication
- User signup and login
- JWT-based authentication
- Password protection using bcrypt

### Product Management
- Create products
- SKU / product code management
- Product categories
- Unit of measure
- Initial stock
- Minimum stock / reorder point
- Reorder quantity
- Product search and filtering
- Stock status tracking

### Inventory Operations
- Receipts for incoming stock
- Delivery orders for outgoing stock
- Internal stock transfers
- Inventory adjustments
- Complete move history / stock ledger

### Dashboard
- Total products
- Total stock
- Low-stock products
- Out-of-stock products
- Reorder indicators
- Recent inventory movements

## Tech Stack

### Frontend
- React
- Vite
- React Router
- CSS
- Fetch API

### Backend
- Node.js
- Express.js
- JWT
- bcryptjs

### Database
- SQLite
- Node.js node:sqlite

## Project Structure

```text
StockSense/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── api.js
│   └── package.json
│
├── server/
│   ├── src/
│   │   └── server.js
│   └── package.json
│
├── .gitignore
├── package.json
└── README.md

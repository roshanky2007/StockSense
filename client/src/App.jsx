import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Receipts from "./pages/Receipts";
import MovementPage from "./pages/MovementPage";
import MoveHistory from "./pages/MoveHistory";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}
        <Route
          path="/"
          element={
            <Navigate
              to={
                localStorage.getItem("stocksenseToken")
                  ? "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />

        {/* AUTH */}
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* PRODUCTS */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        {/* RECEIPTS */}
        <Route
          path="/operations/receipts"
          element={
            <ProtectedRoute>
              <Receipts />
            </ProtectedRoute>
          }
        />

        {/* DELIVERY ORDERS */}
        <Route
          path="/operations/deliveries"
          element={
            <ProtectedRoute>
              <MovementPage
                type="DELIVERY"
                title="Delivery Orders"
                description="Ship stock out to customers."
                icon="↑"
                quantityLabel="Quantity to Deliver"
                referenceLabel="Sales Order Reference"
              />
            </ProtectedRoute>
          }
        />

        {/* INTERNAL TRANSFERS */}
        <Route
          path="/operations/transfers"
          element={
            <ProtectedRoute>
              <MovementPage
                type="TRANSFER"
                title="Internal Transfers"
                description="Move stock between warehouses or locations."
                icon="⇄"
                quantityLabel="Quantity to Transfer"
                referenceLabel="Reference"
                showLocations
              />
            </ProtectedRoute>
          }
        />

        {/* INVENTORY ADJUSTMENTS */}
        <Route
          path="/operations/adjustments"
          element={
            <ProtectedRoute>
              <MovementPage
                type="ADJUSTMENT"
                title="Inventory Adjustments"
                description="Reconcile recorded stock with the physical count."
                icon="±"
                quantityLabel="Counted Quantity"
                referenceLabel="Reason for Adjustment"
              />
            </ProtectedRoute>
          }
        />

        {/* MOVE HISTORY */}
        <Route
          path="/operations/move-history"
          element={
            <ProtectedRoute>
              <MoveHistory />
            </ProtectedRoute>
          }
        />

        {/* SETTINGS */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route
          path="*"
          element={
            <Navigate to="/" replace />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
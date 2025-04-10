import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute, { AdminRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Sales from "./pages/Sales";
import SalesList from "./pages/SalesList";
import Orders from "./pages/Orders";
import Users from "./pages/Users";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import POS from "./pages/POS";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Redirection de la racine vers le dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                {/* Point de vente */}
                <Route path="pos" element={<POS />} />

                {/* Tableau de bord et ses sous-pages */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dashboard/products" element={<Products />} />
                <Route path="dashboard/sales" element={<SalesList />} />
                <Route path="dashboard/orders" element={<Orders />} />
                
                {/* Admin only routes */}
                <Route element={<AdminRoute />}>
                  <Route path="dashboard/users" element={<Users />} />
                </Route>
                
                <Route path="dashboard/reports" element={<Reports />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardOverview from "./pages/dashboard/Overview";
import DashboardProducts from "./pages/dashboard/Products";
import DashboardBids from "./pages/dashboard/Bids";
import DashboardBidsHistory from "./pages/dashboard/BidsHistory";
import DashboardProfile from "./pages/dashboard/Profile";
import DashboardSms from "./pages/dashboard/Sms";
import DashboardFarmers from "./pages/dashboard/Farmers";
import DashboardAdmin from "./pages/dashboard/Admin";
import Receipt from "./pages/Receipt";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/receipt/:auctionId" element={<Receipt />} />
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="products" element={<DashboardProducts />} />
          <Route path="bids" element={<DashboardBids />} />
          <Route path="bids-history" element={<DashboardBidsHistory />} />
          <Route path="sms" element={<DashboardSms />} />
          <Route path="farmers" element={<DashboardFarmers />} />
          <Route path="admin" element={<DashboardAdmin />} />
          <Route path="profile" element={<DashboardProfile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

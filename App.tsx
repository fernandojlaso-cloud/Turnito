import { Navigate, Route, Routes } from "react-router-dom";
import Reservar from "./pages/Reservar";
import AdminRoutes from "./pages/admin/AdminRoutes";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/r/:slug" element={<Reservar />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
    </Routes>
  );
}

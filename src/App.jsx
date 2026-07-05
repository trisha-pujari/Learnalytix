// src/App.jsx

import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState } from "react";

import Login           from "./components/Login";
import Register        from "./components/Register";
import Predict         from "./pages/Predict";
import AdminDashboard  from "./pages/AdminDashboard";
import StudentLookup   from "./pages/StudentLookup";
import StudentProfile  from "./pages/StudentProfile";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("learnalytix_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (role, name) => {
    const u = { role, name };
    setUser(u);
    localStorage.setItem("learnalytix_user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("learnalytix_user");
  };

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<Login    onLogin={handleLogin} onRegister={() => {}} />} />
          <Route path="/register" element={<Register onRegister={() => {}} onLogin={() => {}} />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  const isAdmin = user.role === "admin";

  return (
    <BrowserRouter>
      <nav className="app-nav">
        <span className="nav-brand">Learnalytix</span>
        <div className="nav-links">
          {isAdmin && <Link to="/dashboard">Dashboard</Link>}
          {isAdmin && <Link to="/students">Lookup</Link>}
          <Link to="/predict">Predict</Link>
          <span className="nav-user">{user.name} ({user.role})</span>
          <button className="nav-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <main className="app-main">
        <Routes>
          <Route path="/dashboard"      element={isAdmin ? <AdminDashboard /> : <Navigate to="/predict" />} />
          <Route path="/students"       element={isAdmin ? <StudentLookup />  : <Navigate to="/predict" />} />
          <Route path="/students/:rollNo" element={isAdmin ? <StudentProfile /> : <Navigate to="/predict" />} />
          <Route path="/predict"        element={<Predict />} />
          <Route path="*"               element={<Navigate to={isAdmin ? "/dashboard" : "/predict"} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
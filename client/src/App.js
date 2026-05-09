import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";

import EquipmentPage from "./pages/EquipmentPage";
import RentalsPage from "./pages/RentalsPage";
import PaymentPage from "./pages/PaymentPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import "./index.css";

function ProtectedRoute({ user, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // зчитуємо користувача з localStorage один раз при старті
  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setInitializing(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
  };

  if (initializing) {
    return <p style={{ padding: "20px" }}>Завантаження...</p>;
  }

  return (
    <div className="app-root">
      <header className="main-header">
        <div className="header-inner">
          <div className="logo-block">
            <span className="logo">SportRent</span>
          </div>

          <nav className="main-nav">
            <NavLink to="/" end>
              Обладнання
            </NavLink>

            <NavLink to="/rentals">Мої оренди</NavLink>

            <NavLink to="/payment">Оплата</NavLink>

            {!user && (
              <>
                <NavLink to="/register">Реєстрація</NavLink>
                <NavLink to="/login">Вхід</NavLink>
              </>
            )}
          </nav>

          <div>
            {user ? (
              <>
                <span style={{ marginRight: "10px" }}>
                  {user.email || "Користувач"}
                </span>
                <button className="logout-btn" onClick={handleLogout}>
                  Вийти
                </button>
              </>
            ) : (
              <span>Гість</span>
            )}
          </div>
        </div>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<EquipmentPage user={user} />} />

          <Route
            path="/rentals"
            element={
              <ProtectedRoute user={user}>
                <RentalsPage user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <ProtectedRoute user={user}>
                <PaymentPage user={user} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/register"
            element={
              <RegisterPage
                onAuth={(authData) => {
                  localStorage.setItem("authToken", authData.token);
                  localStorage.setItem(
                    "authUser",
                    JSON.stringify(authData.user)
                  );
                  setUser(authData.user);
                }}
              />
            }
          />

          <Route
            path="/login"
            element={
              <LoginPage
                onAuth={(authData) => {
                  localStorage.setItem("authToken", authData.token);
                  localStorage.setItem(
                    "authUser",
                    JSON.stringify(authData.user)
                  );
                  setUser(authData.user);
                }}
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer>
        <p>© 2026 SportRent. Усі права захищені.</p>
        <p>
          Email:{" "}
          <a href="mailto:shvets@sportrent.ua">shvets@sportrent.ua</a> | Телефон:
          +38 (098) 153-22-07
        </p>
      </footer>
    </div>
  );
}

export default App;
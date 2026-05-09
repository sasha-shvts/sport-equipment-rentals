import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_URL from "../api";

function LoginPage({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Не вдалося увійти");
        return;
      }

      if (onAuth) {
        onAuth(data);
      } else {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", JSON.stringify(data.user));
      }

      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Помилка з’єднання з сервером");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-top">
          <h2>Вхід</h2>
          <p>Увійдіть у свій акаунт, щоб керувати орендами.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-label">
            Пароль
            <input
              className="auth-input"
              type="password"
              placeholder="Ваш пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit">
            Увійти
          </button>
        </form>

        <div className="auth-bottom">
          Немає акаунта?{" "}
          <Link to="/register" className="auth-link">
            Зареєструватися
          </Link>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
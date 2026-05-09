import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API_URL from "../api";

function RegisterPage({ onAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Не вдалося зареєструватися");
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
      console.error("Register error:", err);
      setError("Помилка з’єднання з сервером");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-top">
          <h2>Реєстрація</h2>
          <p>
            Створіть акаунт, щоб оформлювати оренду і переглядати свої
            замовлення.
          </p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <label className="auth-label">
            Ім’я
            <input
              className="auth-input"
              type="text"
              placeholder="Ваше ім’я (необов’язково)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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
              placeholder="Мінімум 6 символів"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <label className="auth-label">
            Підтвердження пароля
            <input
              className="auth-input"
              type="password"
              placeholder="Повторіть пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit">
            Зареєструватися
          </button>
        </form>

        <div className="auth-bottom">
          Вже маєте акаунт?{" "}
          <Link to="/login" className="auth-link">
            Увійти
          </Link>
        </div>
      </section>
    </main>
  );
}

export default RegisterPage;
import React, { useEffect, useState } from "react";
import API_URL from "../api";

function PaymentPage({ user }) {
  const [cartItems, setCartItems] = useState([]);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCartItems = async () => {
    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      setCartItems([]);
      setAmount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/rentals?status=cart`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося завантажити кошик");
      }

      const preparedItems = data.map((item) => {
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        const diff = end - start;

        const days = diff >= 0 ? Math.floor(diff / msPerDay) + 1 : 0;

        const totalPrice =
          Number(item.totalPrice) || (Number(item.rentalPrice) || 0) * days;

        return {
          ...item,
          days,
          totalPrice,
        };
      });

      setCartItems(preparedItems);
    } catch (err) {
      console.error("Помилка завантаження кошика:", err);
      alert(err.message || "Не вдалося завантажити кошик.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartItems();
  }, [user]);

  useEffect(() => {
    const sum = cartItems.reduce(
      (acc, item) => acc + (Number(item.totalPrice) || 0),
      0
    );
    setAmount(sum);
  }, [cartItems]);

  const handleRemove = async (id) => {
    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      alert("Щоб видалити товар, увійдіть в акаунт.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/rentals/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося видалити товар із кошика");
      }

      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Помилка видалення з кошика:", err);
      alert(err.message || "Не вдалося видалити товар із кошика.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      alert("Щоб виконати оплату, увійдіть в акаунт.");
      return;
    }

    if (amount <= 0 || cartItems.length === 0) {
      alert("Немає товарів для оплати.");
      return;
    }

    if (method === "card") {
      if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
        alert("Будь ласка, заповніть усі дані картки.");
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/rentals/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося завершити оплату");
      }

      alert("Оплату успішно виконано!");

      setCartItems([]);
      setCardNumber("");
      setCardName("");
      setCardExpiry("");
      setCardCvv("");
      setMethod("card");
      setAmount(0);
    } catch (err) {
      console.error("Помилка під час оплати:", err);
      alert(err.message || "Не вдалося завершити оплату.");
    }
  };

  return (
    <main>
      <div
        id="cart-summary"
        style={{
          marginBottom: "20px",
          padding: "16px",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          backgroundColor: "#fafafa",
        }}
      >
        <h3>Ваш кошик</h3>

        <div className="cart-items">
          {loading && <p>Завантаження кошика...</p>}

          {!loading && cartItems.length === 0 && <p>Кошик порожній.</p>}

          {!loading &&
            cartItems.map((item) => (
              <p key={item.id}>
                {item.equipment} — {item.days} дн. — {item.totalPrice} грн
                <button
                  type="button"
                  className="remove-btn"
                  style={{ marginLeft: 8 }}
                  onClick={() => handleRemove(item.id)}
                >
                  Видалити
                </button>
              </p>
            ))}
        </div>

        <p>
          Разом: <span id="cart-total">{amount} грн</span>
        </p>
      </div>

      <section id="payment">
        <h2>Оплата</h2>

        <p className="payment-subtitle">
          Виберіть спосіб оплати та введіть дані.
        </p>

        <form id="payment-form" onSubmit={handleSubmit}>
          <label>
            Сума до оплати (грн)
            <input
              type="number"
              name="amount"
              id="amount-input"
              min="0"
              placeholder="0"
              required
              readOnly
              value={amount}
            />
          </label>

          <label>
            Спосіб оплати
            <select
              name="method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              required
            >
              <option value="card">Банківська картка</option>
              <option value="cash">Готівка при отриманні</option>
              <option value="transfer">Банківський переказ</option>
            </select>
          </label>

          <label>
            Номер картки
            <input
              type="text"
              name="card-number"
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              required={method === "card"}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
            />
          </label>

          <label>
            Ім’я власника картки
            <input
              type="text"
              name="card-name"
              placeholder="Ім’я Прізвище"
              required={method === "card"}
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            />
          </label>

          <label>
            Дата закінчення дії
            <input
              type="month"
              name="card-expiry"
              required={method === "card"}
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value)}
            />
          </label>

          <label>
            CVV
            <input
              type="password"
              name="card-cvv"
              maxLength="4"
              inputMode="numeric"
              pattern="[0-9]{3,4}"
              required={method === "card"}
              value={cardCvv}
              onChange={(e) => setCardCvv(e.target.value)}
            />
          </label>

          <button type="submit">Оплатити</button>
        </form>
      </section>
    </main>
  );
}

export default PaymentPage;
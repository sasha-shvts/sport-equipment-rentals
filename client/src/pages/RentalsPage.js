import React, { useState, useEffect, useMemo, useCallback } from "react";
import API_URL from "../api";

function normalizeDate(dateStr) {
  if (!dateStr) return new Date();
  const date = new Date(`${dateStr}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function calculateDaysAndPrice(rental) {
  const start = normalizeDate(rental.start);
  const end = normalizeDate(rental.end);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = end - start;

  if (diff < 0) {
    return { days: 0, totalPrice: 0 };
  }

  const days = Math.floor(diff / msPerDay) + 1;
  const price = Number(rental.price) || 0;
  const totalPrice = price * days;

  return { days, totalPrice };
}

function RentalsPage({ user }) {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const fetchUserRentals = useCallback(async () => {
    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      setRentals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const min = minPrice !== "" ? minPrice : 0;
      const max = maxPrice !== "" ? maxPrice : 100000;

      const response = await fetch(
        `${API_URL}/api/rentals?status=confirmed&minPrice=${min}&maxPrice=${max}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося отримати оренди");
      }

      const userRentals = data.map((item) => ({
        id: item.id,
        equipment: item.equipment,
        price: item.rentalPrice,
        start: item.startDate ? item.startDate.split("T")[0] : "",
        end: item.endDate ? item.endDate.split("T")[0] : "",
        img: item.img || null,
      }));

      setRentals(userRentals);
    } catch (err) {
      console.error("Помилка читання оренд із сервера:", err);
      alert(err.message || "Не вдалося отримати оренди.");
    } finally {
      setLoading(false);
    }
  }, [user, minPrice, maxPrice]);

  useEffect(() => {
    fetchUserRentals();
  }, [fetchUserRentals]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();

  const orderedRentals = useMemo(() => {
    if (!rentals.length) return [];

    const active = [];
    const finished = [];

    for (let k = 0; k < rentals.length; k++) {
      const r = rentals[k];
      if (!r || !r.end) continue;

      const endDateObj = normalizeDate(r.end);

      if (endDateObj.getTime() >= todayTime) {
        active.push(r);
      } else {
        finished.push(r);
      }
    }

    return [...active, ...finished];
  }, [rentals, todayTime]);

  const handleCancel = async (rental) => {
    if (!window.confirm("Скасувати оренду?")) return;

    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      alert("Щоб керувати орендами, увійдіть в акаунт.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/rentals/${rental.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося видалити оренду");
      }

      setRentals((prev) => prev.filter((r) => r.id !== rental.id));
    } catch (err) {
      console.error("Помилка видалення оренди:", err);
      alert(err.message || "Не вдалося скасувати оренду.");
    }
  };

  return (
    <main>
      <section id="my-rentals">
        <h2>Мої оренди</h2>

        <div className="rentals-filter">
          <h3 className="rentals-filter__title">Фільтр за ціною оренди</h3>
          <div className="rentals-filter__controls">
            <input
              type="number"
              min="0"
              placeholder="Мін. ціна"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="rentals-filter__input"
            />
            <input
              type="number"
              min="0"
              placeholder="Макс. ціна"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="rentals-filter__input"
            />
            <button
              type="button"
              onClick={fetchUserRentals}
              className="rentals-filter__button"
            >
              Застосувати
            </button>
          </div>
        </div>

        {loading && <p>Завантаження оренд...</p>}

        {!loading && !orderedRentals.length && (
          <p>
            Наразі у вас немає оформлених оренд. Додайте обладнання в кошик і
            завершіть оплату.
          </p>
        )}

        <div className="rentals-grid">
          {!loading &&
            orderedRentals.map((rental) => {
              const equipmentName = rental.equipment || "";
              const nameLower = equipmentName.toLowerCase();

              let bgClass = "";
              if (nameLower.includes("велосипед")) bgClass = "rental-bike";
              else if (nameLower.includes("теніс")) bgClass = "rental-tennis";
              else if (nameLower.includes("сноуборд"))
                bgClass = "rental-snowboard";
              else if (nameLower.includes("роликов"))
                bgClass = "rental-rollers";
              else if (nameLower.includes("sup")) bgClass = "rental-sup";
              else if (nameLower.includes("кемпінг"))
                bgClass = "rental-camping";
              else if (nameLower.includes("лиж")) bgClass = "rental-skis";
              else if (nameLower.includes("трекінг"))
                bgClass = "rental-trekking";
              else if (nameLower.includes("каяк")) bgClass = "rental-kayak";

              const end = normalizeDate(rental.end);

              let statusText = "АКТИВНА";
              let statusClass = "active";
              let showBadge = false;

              if (today.getTime() > end.getTime()) {
                statusText = "ЗАВЕРШЕНА";
                statusClass = "finished";
              } else if (today.getTime() === end.getTime()) {
                showBadge = true;
              }

              const { days, totalPrice } = calculateDaysAndPrice(rental);

              const backgroundStyle = rental.img
                ? {
                    backgroundImage: `url(${
                      process.env.PUBLIC_URL + rental.img
                    })`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
                : undefined;

              return (
                <article
                  key={rental.id}
                  className={`rental-card ${statusClass} ${bgClass}`}
                >
                  <header style={backgroundStyle}>
                    <h3>{equipmentName || "Без назви"}</h3>
                    <span className="rental-status">{statusText}</span>
                  </header>

                  {showBadge && (
                    <span className="ending-today">Закінчується сьогодні</span>
                  )}

                  <p className="rental-date">
                    {rental.start || "—"} — {rental.end || "—"}
                  </p>

                  <p className="rental-meta">
                    {days} дн. • {totalPrice} грн
                  </p>

                  <button
                    className="cancel-btn"
                    onClick={() => handleCancel(rental)}
                  >
                    Скасувати оренду
                  </button>
                </article>
              );
            })}
        </div>
      </section>
    </main>
  );
}

export default RentalsPage;
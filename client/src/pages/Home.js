import React, { useEffect, useState } from "react";

function normalizeDate(dateStr) {
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
  const totalPrice = rental.price * days;
  return { days, totalPrice };
}

function getCart() {
  try {
    const raw = localStorage.getItem("rentCart");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("rentCart", JSON.stringify(cart));
}

function getPaymentCart() {
  try {
    const raw = localStorage.getItem("rentPaymentCart");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePaymentCart(cart) {
  localStorage.setItem("rentPaymentCart", JSON.stringify(cart));
}

function HomePage() {

  const [equipment, setEquipment] = useState([]);

  const [loading, setLoading] = useState(true);

  const [cartCount, setCartCount] = useState(getCart().length);

  useEffect(() => {
  setEquipment(equipmentData);
  setLoading(false);
  }, []);

  useEffect(() => {
    // Оновлює кількість оренд при першому рендері.
    setCartCount(getCart().length);
  }, []);

  const handleRent = (item) => {

    const startStr = prompt("Початок оренди (формат YYYY-MM-DD):");
    const endStr = prompt("Кінець оренди (формат YYYY-MM-DD):");

    if (!startStr || !endStr) return;

    const rentalEntry = {
      id: Date.now() + Math.random(),
      equipment: item.name,
      price: item.price,
      start: startStr,
      end: endStr,
    };

    const { days, totalPrice } = calculateDaysAndPrice(rentalEntry);

    if (days <= 0) {
      alert("Некоректний діапазон дат!");
      return;
    }

    rentalEntry.days = days;
    rentalEntry.totalPrice = totalPrice;

    const cart = getCart();
    cart.push(rentalEntry);
    saveCart(cart);

    const paymentCart = getPaymentCart();
    paymentCart.push({ ...rentalEntry });
    savePaymentCart(paymentCart);

    setCartCount(cart.length);
    alert("Оренду додано до кошика!");
  };

  if (loading) {
    return (
      <main>
        <p>Завантаження обладнання...</p>
      </main>
    );
  }

  return (
    <main>
      <section id="equipment">
        <h2>Обладнання</h2>
        <p>Мої оренди: {cartCount}</p>

        <div className="equipment-grid">
          {equipment.map((item) => (
            <article key={item.id || item.name} className="equipment-card">
              <img src={item.img} alt={item.name} />
              <h3>{item.name}</h3>
              <p>{item.short}</p>

              {item.features && item.features.length > 0 && (
                <ul>
                  {item.features.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              )}

              <p className="price">{item.price} грн / день</p>

              <button type="button" onClick={() => handleRent(item)}>
                Орендувати
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HomePage;
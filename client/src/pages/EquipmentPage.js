import React, { useState, useEffect, useRef } from "react";
import Flatpickr from "react-flatpickr";
import Toast from "../components/Toast";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import API_URL from "../api";

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

function EquipmentPage({ user }) {
  const [equipment, setEquipment] = useState([]);
  const [rentStats, setRentStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rentStats")) || {};
    } catch {
      return {};
    }
  });

  const [filter, setFilter] = useState("Всі");
  const [message, setMessage] = useState("");
  const [addedId, setAddedId] = useState(null);

  const [comments, setComments] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    comment: "",
  });

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const [showExtraInfo, setShowExtraInfo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const pickersRef = useRef({});

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const snapshot = await getDocs(collection(db, "equipment"));
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setEquipment(list);
      } catch (err) {
        console.error("Помилка завантаження equipment з Firestore:", err);
      }
    };

    fetchEquipment();
  }, []);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const snapshot = await getDocs(collection(db, "comments"));
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        list.sort(
          (a, b) => new Date(b.datetime || 0) - new Date(a.datetime || 0)
        );

        setComments(list);
      } catch (err) {
        console.error("Помилка завантаження comments з Firestore:", err);
      }
    };

    fetchComments();
  }, []);

  useEffect(() => {
    localStorage.setItem("rentStats", JSON.stringify(rentStats));
  }, [rentStats]);

  const filteredEquipment =
    filter === "Всі"
      ? equipment
      : equipment.filter((item) => item.sportType === filter);

  const addRentForItem = async (item, title, startStr, endStr) => {
    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      alert("Щоб додати в кошик, увійдіть в акаунт.");
      return;
    }

    const rentalPreview = {
      price: item.price,
      start: startStr,
      end: endStr,
    };

    const { days, totalPrice } = calculateDaysAndPrice(rentalPreview);

    if (days <= 0) {
      alert("Некоректний діапазон дат!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/rentals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          equipment: title,
          category: item.sportType || "Інше",
          rentalPrice: item.price,
          startDate: `${startStr}T00:00:00.000Z`,
          endDate: `${endStr}T00:00:00.000Z`,
          img: item.img || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Не вдалося додати в кошик");
      }

      const cleanTitle = item.name;
      setRentStats((prev) => ({
        ...prev,
        [cleanTitle]: (prev[cleanTitle] || 0) + 1,
      }));

      setMessage(`Додано в кошик: ${days} дн., ${totalPrice} грн`);
      setAddedId(item.id || item.name);

      setToastMessage("Обладнання додано в кошик");
      setToastVisible(true);

      setTimeout(() => {
        setToastVisible(false);
      }, 2500);

      setTimeout(() => {
        setMessage("");
        setAddedId(null);
      }, 2000);

      console.log("Додано в кошик на сервері:", data);
    } catch (err) {
      console.error("Помилка додавання в кошик на сервер:", err);
      alert(err.message || "Не вдалося додати в кошик.");
    }
  };

  const handleRentClick = (item) => {
    const token = localStorage.getItem("authToken");

    if (!user || !token) {
      alert("Щоб оформити оренду, увійдіть в акаунт.");
      return;
    }

    const key = item.id || item.name;
    const pickerInstance = pickersRef.current[key];

    if (pickerInstance && pickerInstance.flatpickr) {
      pickerInstance.flatpickr.open();
    }
  };

  let popularName = null;
  let maxCount = 0;

  for (const name in rentStats) {
    if (rentStats[name] > maxCount) {
      maxCount = rentStats[name];
      popularName = name;
    }
  }

  const handleFormChange = (e) => {
    const { id, value } = e.target;

    if (id === "user-name") setForm((prev) => ({ ...prev, name: value }));
    if (id === "user-email") setForm((prev) => ({ ...prev, email: value }));
    if (id === "user-comment") setForm((prev) => ({ ...prev, comment: value }));
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.comment) {
      alert("Будь ласка, заповніть всі поля!");
      return;
    }

    const commentData = {
      name: form.name,
      email: form.email,
      text: form.comment,
      datetime: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "comments"), commentData);

      setComments((prev) => [{ id: docRef.id, ...commentData }, ...prev]);
      setForm({ name: "", email: "", comment: "" });
    } catch (err) {
      console.error("Помилка додавання коментаря в Firestore:", err);
      alert("Сталася помилка при збереженні коментаря.");
    }
  };

  const deleteComment = async (id) => {
    if (!window.confirm("Ви впевнені, що хочете видалити цей коментар?")) return;

    try {
      await deleteDoc(doc(db, "comments", id));
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Помилка видалення коментаря з Firestore:", err);
      alert("Не вдалося видалити коментар.");
    }
  };

  return (
    <>
      <main>
        <section className="extra-info">
          <h2>Додаткова інформація</h2>

          <button
            type="button"
            className="info-toggle-btn"
            onClick={() => setShowExtraInfo((prev) => !prev)}
          >
            {showExtraInfo ? "Приховати інформацію" : "Показати інформацію"}
          </button>

          {showExtraInfo && (
            <p className="extra-info-text">
              Наша платформа створена для тих, хто любить активний відпочинок,
              але не хоче купувати дороге спорядження. Ви просто обираєте
              необхідне обладнання, задаєте дати оренди та оформлюєте замовлення
              онлайн — усе займає кілька хвилин.
            </p>
          )}

          <div className="extra-info-chips">
            <button
              type="button"
              className={
                "extra-chip" +
                (selectedCategory === "велоспорт" ? " extra-chip-active" : "")
              }
              onClick={() => setSelectedCategory("велоспорт")}
            >
              Велоспорт
            </button>

            <button
              type="button"
              className={
                "extra-chip" +
                (selectedCategory === "теніс" ? " extra-chip-active" : "")
              }
              onClick={() => setSelectedCategory("теніс")}
            >
              Теніс
            </button>

            <button
              type="button"
              className={
                "extra-chip" +
                (selectedCategory === "зимові" ? " extra-chip-active" : "")
              }
              onClick={() => setSelectedCategory("зимові")}
            >
              Зимові види спорту
            </button>

            <button
              type="button"
              className={
                "extra-chip" +
                (selectedCategory === "водні" ? " extra-chip-active" : "")
              }
              onClick={() => setSelectedCategory("водні")}
            >
              Водні види спорту
            </button>
          </div>

          <div className="extra-info-details">
            {!selectedCategory && (
              <p>Натисніть на категорію, щоб побачити опис.</p>
            )}

            {selectedCategory === "велоспорт" && (
              <p>
                У розділі велоспорту ви знайдете гірські, міські та
                прогулянкові велосипеди для різних типів маршрутів. Доступні
                моделі для новачків і досвідчених райдерів, з різними розмірами
                рам та колес. Ми також пропонуємо шоломи, замки та додаткові
                аксесуари, щоб зробити ваші поїздки безпечними та комфортними.
              </p>
            )}

            {selectedCategory === "теніс" && (
              <p>
                У тенісній категорії доступні ракетки для дорослих і дітей,
                м’ячі тренувальної та матчевої якості, а також сітки й базове
                спорядження для тренувань. Ви можете орендувати комплект для
                гри в залі або на відкритому корті, не витрачаючись на купівлю
                власного інвентарю.
              </p>
            )}

            {selectedCategory === "зимові" && (
              <p>
                Зимове спорядження включає лижі, сноуборди, черевики, палиці та
                захисні шоломи для катання на гірськолижних курортах. Ми
                підбираємо спорядження з урахуванням вашого зросту, ваги та
                рівня підготовки, щоб забезпечити стабільність і контроль на
                схилі. За потреби ви можете доповнити комплект маскою,
                рукавицями та іншими аксесуарами.
              </p>
            )}

            {selectedCategory === "водні" && (
              <p>
                У водній категорії ви знайдете каяки, SUP-дошки та рятувальні
                жилети, які підходять для відпочинку на озерах і спокійних
                річках. Спорядження розраховане як на спокійні прогулянки, так
                і на більш активне катання. Ми рекомендуємо завжди
                використовувати засоби безпеки та заздалегідь планувати маршрут
                на воді.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2>Обладнання</h2>

          <label>
            Фільтр за категорією
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option>Всі</option>
              <option value="велоспорт">Велоспорт</option>
              <option value="теніс">Теніс</option>
              <option value="зимові">Зимові</option>
              <option value="водні">Водні</option>
            </select>
          </label>

          {message && <p style={{ color: "green" }}>{message}</p>}

          <div className="equipment-grid">
            {filteredEquipment.map((item, index) => {
              const isPremium = item.price > 400;
              const baseTitle = item.name;

              const displayTitle =
                isPremium && !baseTitle.includes("★")
                  ? `★ ${baseTitle} (Преміум)`
                  : baseTitle;

              const cleanTitle = baseTitle
                .replace(/^★\s*/, "")
                .replace(" (Преміум)", "");

              const isPopular = popularName && cleanTitle === popularName;

              const key = item.id || item.name;
              const isAdded = addedId === key;

              return (
                <article
                  key={key}
                  className="equipment-card"
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? "#f0f8ff" : "#e8f5e9",
                    position: "relative",
                  }}
                >
                  {item.img && (
                    <img
                      src={process.env.PUBLIC_URL + item.img}
                      alt={displayTitle}
                    />
                  )}

                  <h3>{displayTitle}</h3>
                  {item.short && <p>{item.short}</p>}

                  {Array.isArray(item.features) && item.features.length > 0 && (
                    <ul>
                      {item.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}

                  <p className="price">{item.price} грн / день</p>

                  <button
                    type="button"
                    onClick={() => handleRentClick(item)}
                    className={isAdded ? "rented" : ""}
                  >
                    {isAdded
                      ? "Додано ✓"
                      : isPopular
                      ? "Популярна оренда"
                      : "Орендувати"}
                  </button>

                  <Flatpickr
                    ref={(el) => {
                      if (el) {
                        pickersRef.current[key] = el;
                      }
                    }}
                    options={{
                      mode: "range",
                      dateFormat: "Y-m-d",
                      minDate: "today",
                      onClose: (selectedDates) => {
                        if (selectedDates.length !== 2) return;

                        const [start, end] = selectedDates;
                        const startStr = start.toISOString().split("T")[0];
                        const endStr = end.toISOString().split("T")[0];

                        addRentForItem(item, baseTitle, startStr, endStr);
                      },
                    }}
                    style={{
                      opacity: 0,
                      position: "absolute",
                      pointerEvents: "none",
                    }}
                  />
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <h2>Коментарі</h2>

          <form onSubmit={handleCommentSubmit} id="comment-form">
            <input
              id="user-name"
              placeholder="Ім’я"
              value={form.name}
              onChange={handleFormChange}
            />
            <input
              id="user-email"
              placeholder="Email"
              value={form.email}
              onChange={handleFormChange}
            />
            <textarea
              id="user-comment"
              placeholder="Коментар"
              value={form.comment}
              onChange={handleFormChange}
            />
            <button type="submit">Надіслати</button>
          </form>

          <div id="comments-list">
            {comments.map((c) => (
              <div key={c.id} className="comment">
                <div className="comment-header">
                  <h4>{c.name}</h4>
                  <span className="comment-date">
                    {c.datetime
                      ? new Date(c.datetime).toLocaleString()
                      : ""}
                  </span>
                  <button
                    className="delete-comment-btn"
                    onClick={() => deleteComment(c.id)}
                    type="button"
                  >
                    Видалити
                  </button>
                </div>
                <p>{c.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Toast message={toastMessage} visible={toastVisible} />
    </>
  );
}

export default EquipmentPage;
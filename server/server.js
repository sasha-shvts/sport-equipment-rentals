require("dotenv").config(); 

const express = require("express");
const path = require("path");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const prisma = new PrismaClient();
const PORT = 5000;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ====================== AUTH ======================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email і пароль обов’язкові" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Пароль має містити мінімум 6 символів" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Користувач з таким email вже існує" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name?.trim() || email.split("@")[0],
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "14d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Не вдалося зареєструвати користувача" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email і пароль обов’язкові" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Невірний email або пароль" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Невірний email або пароль" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "14d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Не вдалося увійти" });
  }
});

// ====================== MIDDLEWARE ======================

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Немає токена авторизації" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; 
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Невірний або протермінований токен" });
  }
}


app.get("/api/message", (req, res) => {
  res.json({ message: "Сервер працює успішно!" });
});

// ====================== RENTALS ======================

// Отримати тільки свої оренди (з фільтром за статусом і ЗАГАЛЬНОЮ сумою totalPrice)
app.get("/api/rentals", authMiddleware, async (req, res) => {
  try {
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : 0;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : 100000;
    const userId = String(req.user.id);
    const status = req.query.status || undefined; // "cart" або "confirmed"

    const where = {
      userId,
      totalPrice: {
        gte: minPrice,
        lte: maxPrice,
      },
    };

    if (status) {
      where.status = status;
    }

    const rentals = await prisma.rental.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(rentals);
  } catch (error) {
    console.error("Get rentals error:", error);
    res.status(500).json({ error: "Не вдалося отримати оренди" });
  }
});

// Створити оренду для поточного користувача (додати в кошик)
app.post("/api/rentals", authMiddleware, async (req, res) => {
  try {
    const {
      equipment,
      category,
      rentalPrice,
      startDate,
      endDate,
      img,
    } = req.body;

    const userId = String(req.user.id);

    if (!equipment || !category || !rentalPrice || !startDate || !endDate) {
      return res.status(400).json({ error: "Усі поля обов’язкові" });
    }

    const parsedPrice = parseFloat(rentalPrice);

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: "Некоректна ціна оренди" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Некоректні дати" });
    }

    if (start > end) {
      return res.status(400).json({
        error: "Дата завершення має бути не раніше дати початку",
      });
    }

    // Перевірка, що така ж оренда вже не в кошику
    const existingRental = await prisma.rental.findFirst({
      where: {
        userId,
        equipment,
        startDate: start,
        endDate: end,
        status: "cart",
      },
    });

    if (existingRental) {
      return res.status(409).json({ error: "Така оренда вже є в кошику" });
    }

    // Розрахунок кількості днів та загальної суми
    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = end - start;
    const days = Math.floor(diff / msPerDay) + 1; // включно з останнім днем
    const totalPrice = parsedPrice * days;

    const newRental = await prisma.rental.create({
      data: {
        userId,
        equipment,
        category,
        rentalPrice: parsedPrice, 
        startDate: start,
        endDate: end,
        status: "cart",
        img: img || null,
        totalPrice,               
      },
    });

    res.status(201).json(newRental);
  } catch (error) {
    console.error("Create rental error:", error);
    res.status(500).json({ error: "Не вдалося зберегти оренду" });
  }
});

// Підтвердити всі оренди з кошика (оформити)
app.post("/api/rentals/checkout", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.user.id);

    const result = await prisma.rental.updateMany({
      where: {
        userId,
        status: "cart",
      },
      data: {
        status: "confirmed",
      },
    });

    res.json({ updatedCount: result.count });
  } catch (error) {
    console.error("Checkout rentals error:", error);
    res.status(500).json({ error: "Не вдалося підтвердити оренди" });
  }
});

// Видалити тільки свою оренду (з кошика або зі списку)
app.delete("/api/rentals/:id", authMiddleware, async (req, res) => {
  try {
    const rentalId = Number(req.params.id);
    const userId = String(req.user.id);

    if (isNaN(rentalId)) {
      return res.status(400).json({ error: "Некоректний ID оренди" });
    }

    const existingRental = await prisma.rental.findUnique({
      where: { id: rentalId },
    });

    if (!existingRental) {
      return res.status(404).json({ error: "Оренду не знайдено" });
    }

    if (existingRental.userId !== userId) {
      return res.status(403).json({ error: "Немає доступу до цієї оренди" });
    }

    await prisma.rental.delete({
      where: { id: rentalId },
    });

    res.json({ message: "Оренду успішно скасовано" });
  } catch (error) {
    console.error("Delete rental error:", error);
    res.status(500).json({ error: "Не вдалося видалити оренду" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
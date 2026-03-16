import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("uniflow.db");
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    settings TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    title TEXT,
    content TEXT,
    folder TEXT DEFAULT 'General',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    task TEXT,
    completed INTEGER DEFAULT 0,
    dueDate DATETIME,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    category TEXT,
    amount REAL,
    type TEXT, -- 'income' or 'expense'
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    title TEXT,
    remindAt DATETIME,
    priority TEXT DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
    completed INTEGER DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
      const result = stmt.run(email, hashedPassword, name);
      const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, email, name } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET);
    res.json({ token, user: { id: user.id, email, name: user.name, settings: JSON.parse(user.settings) } });
  });

  // --- Data Routes ---
  app.get("/api/notes", authenticateToken, (req: any, res) => {
    const notes = db.prepare("SELECT * FROM notes WHERE userId = ? ORDER BY updatedAt DESC").all(req.user.id);
    res.json(notes);
  });

  app.post("/api/notes", authenticateToken, (req: any, res) => {
    const { title, content, folder } = req.body;
    const stmt = db.prepare("INSERT INTO notes (userId, title, content, folder) VALUES (?, ?, ?, ?)");
    const result = stmt.run(req.user.id, title, content, folder || 'General');
    res.json({ id: result.lastInsertRowid, title, content, folder });
  });

  app.put("/api/notes/:id", authenticateToken, (req: any, res) => {
    const { title, content, folder } = req.body;
    db.prepare("UPDATE notes SET title = ?, content = ?, folder = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?")
      .run(title, content, folder, req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.delete("/api/notes/:id", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM notes WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Todos
  app.get("/api/todos", authenticateToken, (req: any, res) => {
    const todos = db.prepare("SELECT * FROM todos WHERE userId = ?").all(req.user.id);
    res.json(todos);
  });

  app.post("/api/todos", authenticateToken, (req: any, res) => {
    const { task, dueDate } = req.body;
    const result = db.prepare("INSERT INTO todos (userId, task, dueDate) VALUES (?, ?, ?)")
      .run(req.user.id, task, dueDate);
    res.json({ id: result.lastInsertRowid, task, dueDate, completed: 0 });
  });

  app.patch("/api/todos/:id", authenticateToken, (req: any, res) => {
    const { completed } = req.body;
    db.prepare("UPDATE todos SET completed = ? WHERE id = ? AND userId = ?")
      .run(completed ? 1 : 0, req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.delete("/api/todos/completed", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM todos WHERE userId = ? AND completed = 1").run(req.user.id);
    res.json({ success: true });
  });

  app.delete("/api/todos/:id", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM todos WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Budgets
  app.get("/api/budgets", authenticateToken, (req: any, res) => {
    const budgets = db.prepare("SELECT * FROM budgets WHERE userId = ? ORDER BY date DESC").all(req.user.id);
    res.json(budgets);
  });

  app.post("/api/budgets", authenticateToken, (req: any, res) => {
    const { category, amount, type, date } = req.body;
    const result = db.prepare("INSERT INTO budgets (userId, category, amount, type, date) VALUES (?, ?, ?, ?, ?)")
      .run(req.user.id, category, amount, type, date || new Date().toISOString());
    res.json({ id: result.lastInsertRowid, category, amount, type, date: date || new Date().toISOString() });
  });

  app.delete("/api/budgets/:id", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM budgets WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Reminders
  app.get("/api/reminders", authenticateToken, (req: any, res) => {
    const reminders = db.prepare("SELECT * FROM reminders WHERE userId = ? ORDER BY remindAt ASC").all(req.user.id);
    res.json(reminders);
  });

  app.post("/api/reminders", authenticateToken, (req: any, res) => {
    const { title, remindAt, priority } = req.body;
    const result = db.prepare("INSERT INTO reminders (userId, title, remindAt, priority) VALUES (?, ?, ?, ?)")
      .run(req.user.id, title, remindAt, priority || 'Medium');
    res.json({ id: result.lastInsertRowid, title, remindAt, priority: priority || 'Medium', completed: 0 });
  });

  // Settings
  app.put("/api/user/settings", authenticateToken, (req: any, res) => {
    const settings = JSON.stringify(req.body);
    db.prepare("UPDATE users SET settings = ? WHERE id = ?").run(settings, req.user.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

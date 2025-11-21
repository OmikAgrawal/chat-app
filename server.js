import express from "express";
import bodyParser from "body-parser";
import pkg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "chatdb",
  password: "omik", 
  port: 5432
});

db.connect().catch((err) => {
  console.error("Failed to connect to database:", err);
});

const app = express();
const PORT = 3000;

// View engine & static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Typing indicator (simple global state)
let typingUser = null;

// Home / Join page
app.get("/", (req, res) => {
  res.render("index");
});

// Chat page
app.get("/chat", async (req, res) => {
  const name = req.query.name;

  if (!name) {
    return res.redirect("/");
  }

  try {
    const result = await db.query(
      "SELECT id, username, message, created_at FROM messages ORDER BY created_at ASC LIMIT 50"
    );

    res.render("chat", {
      username: name,
      messages: result.rows
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).send("Internal server error");
  }
});

// Send message
app.post("/send", async (req, res) => {
  const { username, message } = req.body;

  if (!username || !message) {
    return res.redirect("/");
  }

  try {
    await db.query(
      "INSERT INTO messages (username, message) VALUES ($1, $2)",
      [username, message]
    );
  } catch (err) {
    console.error("Error inserting message:", err);
  }

  res.redirect(`/chat?name=${encodeURIComponent(username)}`);
});

// Poll messages (used by client.js)
app.get("/messages", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, username, message, created_at FROM messages ORDER BY created_at ASC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching messages JSON:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Typing endpoints
app.get("/typing", (req, res) => {
  const user = req.query.user;
  if (user) {
    typingUser = user;
    setTimeout(() => {
      // after 1.5s, reset
      if (typingUser === user) typingUser = null;
    }, 1500);
  }
  res.end();
});

app.get("/whoistyping", (req, res) => {
  res.json({ user: typingUser });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

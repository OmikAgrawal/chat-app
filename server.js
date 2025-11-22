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


app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, pass } = req.body;

  const check = await db.query("SELECT * FROM users WHERE username=$1", [name]);

  if (check.rows.length > 0) {
    return res.send("❌ Username already exists, try another.");
  }

  await db.query("INSERT INTO users(username, password) VALUES ($1, $2)", [name, pass]);

  res.send("✅ Registration successful! <a href='/'>Login Now</a>");
});


// Chat page
app.get("/chat", async (req, res) => {
  const name = req.query.name;
  const pass = req.query.pass;

  if (!name || !pass) {
    return res.send("⚠ Username and password required!");
  }

  const result = await db.query("SELECT * FROM users WHERE username=$1", [name]);

  if (result.rows.length === 0) {
    return res.send("❌ User not registered! <a href='/register'>Register here</a>");
  }

  if (result.rows[0].password !== pass) {
    return res.send("❌ Incorrect password. Access denied!");
  }

  // Fetch messages and allow entry
  const msgs = await db.query("SELECT * FROM messages ORDER BY created_at ASC");

  res.render("chat", {
    username: name,
    messages: msgs.rows
  });
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

  const result = await db.query("SELECT password FROM users WHERE username=$1", [username]);
  const password = result.rows[0].password;
  

  res.redirect(`/chat?name=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
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

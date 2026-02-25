import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import Database from "better-sqlite3";
import multer from "multer";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("podcraft.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS speakers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    voice TEXT NOT NULL,
    profession TEXT,
    tone TEXT,
    mode TEXT,
    choiceOfWords TEXT,
    behavior TEXT,
    isPrebuilt INTEGER DEFAULT 0
  )
`);

// Seed pre-built speakers if empty
const speakerCount = db.prepare("SELECT COUNT(*) as count FROM speakers").get() as { count: number };
if (speakerCount.count === 0) {
  const seedSpeakers = [
    { name: "Alex", voice: "Zephyr", profession: "Tech Journalist", tone: "Enthusiastic", mode: "Interviewer", choiceOfWords: "Modern", behavior: "Curious and fast-paced", isPrebuilt: 1 },
    { name: "Dr. Sarah", voice: "Kore", profession: "Scientist", tone: "Calm", mode: "Educator", choiceOfWords: "Academic", behavior: "Methodical and precise", isPrebuilt: 1 },
    { name: "Max", voice: "Fenrir", profession: "Comedian", tone: "Sarcastic", mode: "Storyteller", choiceOfWords: "Casual", behavior: "Witty and prone to tangents", isPrebuilt: 1 },
    { name: "Elena", voice: "Puck", profession: "Historian", tone: "Serious", mode: "Narrator", choiceOfWords: "Sophisticated", behavior: "Eloquent and dramatic", isPrebuilt: 1 },
    { name: "Jordan", voice: "Charon", profession: "Life Coach", tone: "Empathetic", mode: "Guide", choiceOfWords: "Inspirational", behavior: "Warm and encouraging", isPrebuilt: 1 }
  ];

  const insert = db.prepare(`
    INSERT INTO speakers (name, voice, profession, tone, mode, choiceOfWords, behavior, isPrebuilt)
    VALUES (@name, @voice, @profession, @tone, @mode, @choiceOfWords, @behavior, @isPrebuilt)
  `);

  for (const speaker of seedSpeakers) {
    insert.run(speaker);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.get("/api/speakers", (req, res) => {
    const speakers = db.prepare("SELECT * FROM speakers").all();
    res.json(speakers);
  });

  app.post("/api/speakers", (req, res) => {
    const { name, voice, profession, tone, mode, choiceOfWords, behavior } = req.body;
    const result = db.prepare(`
      INSERT INTO speakers (name, voice, profession, tone, mode, choiceOfWords, behavior, isPrebuilt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(name, voice, profession, tone, mode, choiceOfWords, behavior);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/speakers/:id", (req, res) => {
    db.prepare("DELETE FROM speakers WHERE id = ? AND isPrebuilt = 0").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/extract-pdf", upload.single("pdf"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    try {
      const data = await pdf(req.file.buffer);
      res.json({ text: data.text });
    } catch (error) {
      console.error("PDF extraction error:", error);
      res.status(500).json({ error: "Failed to extract PDF text" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

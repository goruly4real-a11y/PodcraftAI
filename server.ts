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
    isPrebuilt INTEGER DEFAULT 0,
    pitch TEXT DEFAULT 'medium',
    speed TEXT DEFAULT 'normal',
    emotion TEXT DEFAULT 'neutral',
    clonedVoiceData TEXT,
    gender TEXT DEFAULT 'non-binary',
    accent TEXT DEFAULT 'Neutral',
    language TEXT DEFAULT 'English'
  )
`);

// Migration: Add gender column if it doesn't exist
try {
  db.prepare("ALTER TABLE speakers ADD COLUMN gender TEXT DEFAULT 'non-binary'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE speakers ADD COLUMN accent TEXT DEFAULT 'Neutral'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE speakers ADD COLUMN language TEXT DEFAULT 'English'").run();
} catch (e) {}

// Migration: Fix genders for prebuilt speakers based on voice
try {
  db.prepare("UPDATE speakers SET gender = 'female' WHERE voice = 'Zephyr' AND isPrebuilt = 1").run();
  db.prepare("UPDATE speakers SET gender = 'female' WHERE voice = 'Kore' AND isPrebuilt = 1").run();
  db.prepare("UPDATE speakers SET gender = 'male' WHERE voice = 'Puck' AND isPrebuilt = 1").run();
  db.prepare("UPDATE speakers SET gender = 'male' WHERE voice = 'Charon' AND isPrebuilt = 1").run();
  db.prepare("UPDATE speakers SET gender = 'male' WHERE voice = 'Fenrir' AND isPrebuilt = 1").run();
} catch (e) {}

// Seed pre-built speakers if empty
const speakerCount = db.prepare("SELECT COUNT(*) as count FROM speakers").get() as { count: number };

const seedSpeakers = [
  { name: "Alex", voice: "Zephyr", profession: "Tech Journalist", tone: "Enthusiastic", mode: "Interviewer", choiceOfWords: "Modern", behavior: "Curious and fast-paced", isPrebuilt: 1, pitch: "medium", speed: "fast", emotion: "excited", gender: "female", accent: "Neutral", language: "English" },
  { name: "Dr. Sarah", voice: "Kore", profession: "Scientist", tone: "Calm", mode: "Educator", choiceOfWords: "Academic", behavior: "Methodical and precise", isPrebuilt: 1, pitch: "medium", speed: "normal", emotion: "serious", gender: "female", accent: "British", language: "English" },
  { name: "Max", voice: "Fenrir", profession: "Comedian", tone: "Sarcastic", mode: "Storyteller", choiceOfWords: "Casual", behavior: "Witty and prone to tangents", isPrebuilt: 1, pitch: "low", speed: "normal", emotion: "sarcastic", gender: "male", accent: "New York", language: "English" },
  { name: "Elena", voice: "Puck", profession: "Historian", tone: "Serious", mode: "Narrator", choiceOfWords: "Sophisticated", behavior: "Eloquent and dramatic", isPrebuilt: 1, pitch: "high", speed: "slow", emotion: "dramatic", gender: "male", accent: "Spanish", language: "English" },
  { name: "Jordan", voice: "Charon", profession: "Life Coach", tone: "Empathetic", mode: "Guide", choiceOfWords: "Inspirational", behavior: "Warm and encouraging", isPrebuilt: 1, pitch: "medium", speed: "normal", emotion: "warm", gender: "male", accent: "Neutral", language: "English" },
  { name: "Chef Remy", voice: "Zephyr", profession: "Culinary Expert", tone: "Passionate", mode: "Storyteller", choiceOfWords: "Expressive", behavior: "Energetic and descriptive", isPrebuilt: 1, pitch: "high", speed: "fast", emotion: "excited", gender: "female", accent: "French", language: "English" },
  { name: "Detective Vance", voice: "Charon", profession: "Investigator", tone: "Gritty", mode: "Interviewer", choiceOfWords: "Direct", behavior: "Analytical and serious", isPrebuilt: 1, pitch: "low", speed: "slow", emotion: "serious", gender: "male", accent: "New York", language: "English" },
  { name: "Professor Lin", voice: "Kore", profession: "Philosopher", tone: "Thoughtful", mode: "Educator", choiceOfWords: "Academic", behavior: "Reflective and calm", isPrebuilt: 1, pitch: "medium", speed: "slow", emotion: "neutral", gender: "female", accent: "Neutral", language: "English" }
];

const insert = db.prepare(`
  INSERT INTO speakers (name, voice, profession, tone, mode, choiceOfWords, behavior, isPrebuilt, pitch, speed, emotion, gender, accent, language)
  VALUES (@name, @voice, @profession, @tone, @mode, @choiceOfWords, @behavior, @isPrebuilt, @pitch, @speed, @emotion, @gender, @accent, @language)
`);

if (speakerCount.count === 0) {
  for (const speaker of seedSpeakers) {
    insert.run(speaker);
  }
} else {
  // Migration: Add the 3 new speakers if they don't exist
  const chefCount = db.prepare("SELECT COUNT(*) as count FROM speakers WHERE name = 'Chef Remy'").get() as { count: number };
  if (chefCount.count === 0) {
    insert.run(seedSpeakers[5]);
    insert.run(seedSpeakers[6]);
    insert.run(seedSpeakers[7]);
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
    const { name, voice, profession, tone, mode, choiceOfWords, behavior, pitch, speed, emotion, clonedVoiceData, gender, accent, language } = req.body;
    const result = db.prepare(`
      INSERT INTO speakers (name, voice, profession, tone, mode, choiceOfWords, behavior, isPrebuilt, pitch, speed, emotion, clonedVoiceData, gender, accent, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, voice, profession, tone, mode, choiceOfWords, behavior, pitch || 'medium', speed || 'normal', emotion || 'neutral', clonedVoiceData || null, gender || 'non-binary', accent || 'Neutral', language || 'English');
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/speakers/:id", (req, res) => {
    db.prepare("DELETE FROM speakers WHERE id = ? AND isPrebuilt = 0").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/extract-pdf", upload.array("pdfs", 10), async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }
    try {
      const results = [];
      for (const file of req.files) {
        const data = await pdf(file.buffer);
        results.push({ name: file.originalname, text: data.text });
      }
      res.json({ results });
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

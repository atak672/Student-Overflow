// database.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./local_website.db'); 

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    user_type TEXT CHECK(user_type IN ('student', 'tutor')) NOT NULL DEFAULT 'student',
    classes TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS office_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tutor_id INTEGER,
    start_time TEXT,
    end_time TEXT,
    status TEXT CHECK(status IN ('open', 'closed')),
    FOREIGN KEY (tutor_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course TEXT NOT NULL,
  status TEXT CHECK(status IN ('waiting', 'admitted', 'completed')) DEFAULT 'waiting',
  zoom_link TEXT,
  FOREIGN KEY (student_id) REFERENCES users(id)
)`);

  
});

module.exports = db;


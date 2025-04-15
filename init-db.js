const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_picture TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      film_id TEXT NOT NULL,
      rental_date TEXT NOT NULL,
      return_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Tables created');
});

db.close();

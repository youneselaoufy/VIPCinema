const express = require('express')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// SQLite DB
const db = new sqlite3.Database('./database.db');

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token is missing.' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token.' });
    req.user = decoded;
    next();
  });
};

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `user_${req.user.id}${ext}`);
  }
});
const upload = multer({ storage });

// API Router
const apiRouter = express.Router();

//  Login
apiRouter.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ message: 'Server error.' });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err || !isMatch) return res.status(401).json({ message: 'Incorrect password.' });
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login successful.', token });
    });
  });
});

//  Register
apiRouter.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  console.log('Incoming registration:', { name, email });

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('[DB ERROR - SELECT]', err);
      return res.status(500).json({ message: 'Database error during lookup.' });
    }
    if (user) {
      console.warn('[REGISTRATION] Email already in use:', email);
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('[BCRYPT ERROR]', err);
        return res.status(500).json({ message: 'Password hashing failed.' });
      }

      db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash], err => {
        if (err) {
          console.error('[DB ERROR - INSERT]', err);  // <-- THIS is the one you're probably hitting
          return res.status(500).json({ message: 'Registration error.' });
        }

        console.log('[REGISTRATION SUCCESSFUL]', email);
        res.status(201).json({ message: 'Registration successful.' });
      });
    });
  });
});


//  Get Movies from TMDb API — handled client-side; no DB movies route needed here

//  Rent a Movie
apiRouter.post('/rent', verifyToken, (req, res) => {
  const { filmId } = req.body;
  if (!filmId) return res.status(400).json({ message: 'Film ID required.' });
  db.get('SELECT COUNT(*) AS count FROM rentals WHERE user_id = ? AND return_date IS NULL', [req.user.id], (err, result) => {
    if (result.count >= 5) {
      return res.status(400).json({ message: 'Cannot rent more than 5 movies at a time.' });
    }
    db.get('SELECT * FROM rentals WHERE user_id = ? AND film_id = ? AND return_date IS NULL', [req.user.id, filmId], (err, row) => {
      if (row) return res.status(400).json({ message: 'You have already rented this movie.' });
      db.run('INSERT INTO rentals (user_id, film_id, rental_date) VALUES (?, ?, datetime("now"))', [req.user.id, filmId], err => {
        if (err) return res.status(500).json({ message: 'Rent failed.' });
        res.json({ message: 'Film rented successfully.' });
      });
    });
  });
});

// Return a Movie
apiRouter.post('/return', verifyToken, (req, res) => {
  const { filmId } = req.body;
  db.run('UPDATE rentals SET return_date = datetime("now") WHERE user_id = ? AND film_id = ? AND return_date IS NULL', [req.user.id, filmId], function(err) {
    if (err) return res.status(500).json({ message: 'Return failed.' });
    if (this.changes === 0) return res.status(404).json({ message: 'No active rental found.' });
    res.json({ message: 'Film returned successfully!' });
  });
});

// 👤 Profile
apiRouter.get('/profile', verifyToken, (req, res) => {
  db.get('SELECT name, email, profile_picture FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ message: 'Erreur serveur' });
    if (!row) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json(row);
  });
});

//  Get User's Rented Movies
apiRouter.get('/rented-movies', verifyToken, (req, res) => {
  db.all(
    `SELECT film_id, rental_date 
     FROM rentals 
     WHERE user_id = ? AND return_date IS NULL 
     ORDER BY rental_date DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: 'Erreur lors de la récupération des films loués.' });
      res.json(rows);
    }
  );
});


//  Upload Profile Picture
apiRouter.post('/upload-profile-picture', verifyToken, upload.single('profilePicture'), (req, res) => {
  const imagePath = `/uploads/${req.file.filename}`;

  db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [imagePath, req.user.id], err => {
    if (err) return res.status(500).json({ message: 'Failed to update profile picture.' });
    res.json({ message: 'Profile picture updated successfully.', path: imagePath });
  });
  
});


//  Update Profile
apiRouter.put('/update-profile', verifyToken, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });

  const updateUser = () => {
    db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id], err => {
      if (err) return res.status(500).json({ message: 'Error updating user.' });
      res.json({ message: 'Profile updated.' });
    });
  };

  if (password) {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({ message: 'Error hashing password.' });
      db.run('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id], err => {
        if (err) return res.status(500).json({ message: 'Error updating password.' });
        updateUser();
      });
    });
  } else {
    updateUser();
  }
});
// Mount API routes first
app.use('/VIPCinema/api', apiRouter);

// Serve static files (like HTML, CSS, JS, images)
app.use('/VIPCinema', express.static(__dirname));

// Direct access to /VIPCinema/ returns index.html
app.get('/VIPCinema/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve other .html pages explicitly (like signup.html, profile.html)
app.get('/VIPCinema/:page', (req, res) => {
  const file = req.params.page;
  if (file.endsWith('.html')) {
    res.sendFile(path.join(__dirname, file));
  } else {
    res.status(404).send('Page Not Found');
  }
});

// Start the server
app.listen(5000, '0.0.0.0', () => {
  console.log('Server running on 0.0.0.0:5000');
});

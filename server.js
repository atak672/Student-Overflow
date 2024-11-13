// server.js
const db = require('./database');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const nodemailer = require('nodemailer');
require('dotenv').config();

app.use(session({
  secret: 'secret-key', 
  resave: false,
  saveUninitialized: true
}));
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); 


function requireLogin(req, res, next) {
    if (!req.session.userId) {
      return res.status(401).send('Unauthorized. Please log in.');
    }
    next();
  }
  function requireTutor(req, res, next) {
    if (req.session.userType === 'tutor') {
      next();
    } else {
      res.status(403).send('Access denied. Only tutors are allowed to access this page.');
    }
  }
  app.use(express.json());


app.post('/join-queue', (req, res) => {
  const { course } = req.body;
  const studentId = req.session.userId; 


  const insertQuery = `INSERT INTO queue (student_id, course, status) VALUES (?, ?, 'waiting')`;
  db.run(insertQuery, [studentId, course], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error joining the queue.' });
    }

    const queueId = this.lastID;
    const positionQuery = `SELECT COUNT(*) AS position FROM queue WHERE course = ? AND status = 'waiting' AND id <= ?`;
    db.get(positionQuery, [course, queueId], (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Error getting queue position.' });
      }

      res.json({ success: true, position: row.position, queueId });
    });
  });
});


app.post('/clear-queue', (req, res) => {
  const userType = req.session.userType; 
  if (userType !== 'tutor') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const query = `DELETE FROM queue`;
  db.run(query, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error clearing queue.' });
    }
    res.json({ success: true, message: 'Queue cleared successfully.' });
  });
});


app.get('/get-tutor-classes-with-queue', (req, res) => {
  const tutorId = req.session.userId;
  
  const classesQuery = `SELECT classes FROM users WHERE id = ?`;
  db.get(classesQuery, [tutorId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error fetching tutor classes.' });
    }

    const classes = row.classes ? row.classes.split(',') : [];

    const classPromises = classes.map(course => {
      return new Promise((resolve, reject) => {
        const queueQuery = `SELECT queue.id AS queueId, users.username FROM queue
                            JOIN users ON queue.student_id = users.id
                            WHERE queue.course = ? AND queue.status = 'waiting'
                            ORDER BY queue.id ASC LIMIT 1`;
        db.get(queueQuery, [course], (err, student) => {
          if (err) {
            console.error(err);
            return reject(err);
          }
          resolve({ name: course, student });
        });
      });
    });

    Promise.all(classPromises)
      .then(classesWithQueue => res.json({ success: true, classes: classesWithQueue }))
      .catch(error => res.status(500).json({ success: false, message: 'Error fetching queue.' }));
  });
});

app.post('/accept-student/:queueId', (req, res) => {
  const queueId = req.params.queueId;
  const { zoomLink } = req.body;

  if (!zoomLink) {
    return res.status(400).json({ success: false, message: 'Zoom link is required.' });
  }

  const updateQuery = `UPDATE queue SET status = 'admitted', zoom_link = ? WHERE id = ?`;
  db.run(updateQuery, [zoomLink, queueId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error accepting student.' });
    }
    res.json({ success: true });
  });
});


app.get('/check-admission-status/:queueId', (req, res) => {
  const queueId = req.params.queueId;

  const admissionQuery = `SELECT zoom_link FROM queue WHERE id = ? AND status = 'admitted'`;
  db.get(admissionQuery, [queueId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ admitted: false });
    }

    if (row) {
      res.json({ admitted: true, zoomLink: row.zoom_link });
    } else {
      res.json({ admitted: false });
    }
  });
});
  

app.get('/check-tutor-status', (req, res) => {
  if (req.session.userType === 'tutor') {
    res.json({ isTutor: true });
  } else {
    res.json({ isTutor: false });
  }
});


app.get('/office-hours', (req, res) => {
  if (req.session.userType === 'tutor') {
    res.sendFile(__dirname + '/public/office-hours-tutor.html');
  } else {
    res.sendFile(__dirname + '/public/office-hours-student.html');
  }
});



app.get('/get-office-hours-status', (req, res) => {
  const query = `SELECT status FROM office_hours ORDER BY id DESC LIMIT 1`;
  db.get(query, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error retrieving office hours status.' });
    }
    const status = row ? row.status : 'closed';
    res.json({ status });
  });
});


app.post('/toggle-office-hours', (req, res) => {
  if (req.session.userType !== 'tutor') {
    return res.status(403).json({ message: 'Access denied. Only tutors can toggle office hours.' });
  }


  const query = `SELECT id, status FROM office_hours ORDER BY id DESC LIMIT 1`;
  db.get(query, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error toggling office hours.' });
    }

    
    const newStatus = row && row.status === 'open' ? 'closed' : 'open';

    if (row) {
      const updateQuery = `UPDATE office_hours SET status = ? WHERE id = ?`;
      db.run(updateQuery, [newStatus, row.id], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error updating office hours status.' });
        }
        res.json({ status: newStatus });
      });
    } else {
      const insertQuery = `INSERT INTO office_hours (tutor_id, start_time, status) VALUES (?, datetime('now'), ?)`;
      db.run(insertQuery, [req.session.userId, newStatus], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error creating new office hours entry.' });
        }
        res.json({ status: newStatus });
      });
    }
  });
});

  

app.get('/', (req, res) => {
  const isLoggedIn = !!req.session.userId; 
  res.sendFile(__dirname + '/public/index.html', { headers: { 'isLoggedIn': isLoggedIn } });
});

app.get('/about', requireLogin, (req, res) => res.sendFile(__dirname + '/public/about.html'));
app.get('/contact', requireLogin, (req, res) => res.sendFile(__dirname + '/public/contact.html'));
app.get('/roles', requireLogin, requireTutor, (req, res) => {
  res.sendFile(__dirname + '/public/roles.html');
});
app.get('/office-hours-student', requireLogin, (req, res) => res.sendFile(__dirname + '/public/office-hours-student.html'));
app.get('/office-hours-tutor', requireLogin, (req, res) => res.sendFile(__dirname + '/public/office-hours-tutor.html'));

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const checkUserQuery = `SELECT username FROM users WHERE username = ?`;
  db.get(checkUserQuery, [username], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Database error.' });
    }
    if (row) {
      return res.status(409).json({ message: 'Username already taken.' });
    }

    const query = `INSERT INTO users (username, password, user_type) VALUES (?, ?, ?)`;
    db.run(query, [username, password, 'student'], function (err) {
      if (err) {
        return res.status(500).json({ message: 'Error registering user.' });
      }
      res.status(201).json({ message: 'Registration successful. You can now log in.' });
    });
  });
});



app.post('/promote', (req, res) => {
  const { username } = req.body;
  
  const queryCheck = `SELECT * FROM users WHERE username = ?`;
  db.get(queryCheck, [username], (err, user) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: 'Error occurred while searching for the user.' });
    }

    if (!user) {
      return res.json({ success: false, message: `User ${username} not found.` });
    }

    const queryUpdate = `UPDATE users SET user_type = 'tutor' WHERE username = ?`;
    db.run(queryUpdate, [username], (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: 'Error promoting the user to tutor.' });
      }

      res.json({ success: true, message: `${username} has been successfully promoted to tutor.` });
    });
  });
});

app.post('/update-classes', (req, res) => {
  if (req.session.userType !== 'tutor') {
    return res.status(403).json({ success: false, message: 'Access denied. Only tutors can update classes.' });
  }

  const classes = req.body.classes;
  const classesString = classes.join(','); 
  const userId = req.session.userId;

  const query = `UPDATE users SET classes = ? WHERE id = ?`;
  db.run(query, [classesString, userId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error updating classes.' });
    }
    res.json({ success: true, message: 'Classes updated successfully.' });
  });
});

app.get('/get-classes', (req, res) => {
  if (req.session.userType !== 'tutor') {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const query = `SELECT classes FROM users WHERE id = ?`;
  db.get(query, [req.session.userId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error fetching classes.' });
    }

    const classes = row.classes ? row.classes.split(',') : [];
    res.json({ success: true, classes: classes });
  });
});



app.post('/send-email', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: email,
    to: 'studentoverflow24@gmail.com',
    subject: `New message from ${email}`,
    text: `My name is ${name}: ${message}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});


app.get('/login-status', (req, res) => {
  const isLoggedIn = !!req.session.userId; 
  res.json({ isLoggedIn });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
  
    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(query, [username, password], (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging in.' });
      }
      if (!user) {
        return res.status(401).json({ message: 'Incorrect username or password.' });
      }
  
      req.session.userId = user.id;
      req.session.userType = user.user_type;
      res.status(200).json({ message: 'Login successful' });
    });
  });


  app.post('/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  

  app.get('/check-login', (req, res) => {
    if (req.session.userId) {
      res.json({ isLoggedIn: true, userType: req.session.userType });
    } else {
      res.json({ isLoggedIn: false });
    }
  });
  

app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));

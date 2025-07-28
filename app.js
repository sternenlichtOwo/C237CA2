const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();


const connection = mysql.createConnection({
  host: 'jux8dy.h.filess.io',
  user: '123456_sayoldest',
  password: '78794d4d85f48bccf75775e215cd54e5c0b3b74b',
  database: '123456_sayoldest'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));
app.use(flash());


const checkAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  } else {
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/login');
  }
};

const checkAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    req.flash('error', 'Access denied');
    res.redirect('/');
  }
};
// !!! Start of Routes !!! // 


// Dashboard
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});


// !!! Start of Sign up and Login Routes !!! FADIAH =============================================== //

// Register page fadiah
app.get('/register', (req, res) => {
  res.render('register', {
    messages: req.flash('error'),
    formData: req.flash('formData')[0]
  });
});

app.post('/register', (req, res) => {
  const { username, email, password, address, contact, role } = req.body;

  if (!username || !email || !password || !address || !contact || !role) {
    req.flash('error', 'All fields are required.');
    req.flash('formData', req.body);
    return res.redirect('/register');
  }

  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    req.flash('formData', req.body);
    return res.redirect('/register');
  }

  const sql = 'INSERT INTO users (username, email, password, address, contact, role) VALUES (?, ?, SHA1(?), ?, ?, ?)';
  connection.query(sql, [username, email, password, address, contact, role], (err, result) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Error registering user.');
      return res.redirect('/register');
    }
    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/login');
  });
});

// Login page fadiah
app.get('/login', (req, res) => {
  res.render('login', {
    messages: req.flash('success'),
    errors: req.flash('error')
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/login');
  }

  const sql = 'SELECT * FROM users WHERE email = ? AND password = SHA1(?)';
  connection.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Database error.');
      return res.redirect('/login');
    }

    if (results.length > 0) {
      req.session.user = results[0];
      req.flash('success', 'Login successful!');
      res.redirect('/');
    } else {
      req.flash('error', 'Invalid email or password.');
      res.redirect('/login');
    }
  });
});

// Logout page fadiah
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// !!! Start of View/List Items !!! VILASINI =================================================== //

// GET /patientList vilasini
app.get('/patientList', (req, res) => {
  const sql = 'SELECT * FROM patient';

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Pass BOTH patients and the logged-in user from the session
    res.render('patientList', {
      patients: results,
      user: req.session.user 
    });
  });
});

// !!! Start of Add Patient !!! KHINE ==================================================== //

// Add get patient 
app.get('/addPatient', checkAuthenticated, checkAdmin, (req, res) => {
  res.render('addPatient', {
    user: req.session.user,
    messages: {
      success: req.flash('success'),
      error: req.flash('error')
    },
    formData: req.flash('formData')[0]
  });
});

// Add post patient 
app.post('/addPatient', checkAuthenticated, checkAdmin, (req, res) => {
  console.log('Received body:', req.body);
  const { full_name, date_of_birth, medical_condition, gender, address, contact, next_of_kin, admission_date } = req.body;

  if (!full_name || !date_of_birth || !medical_condition || !gender || !address || !contact || !next_of_kin || !admission_date) {
    req.flash('error', 'All fields must be filled in.');
    req.flash('formData', req.body);
    return res.redirect('/addPatient');
  }

  const sql = 'INSERT INTO patient (full_name, date_of_birth, medical_condition, gender, address, contact, next_of_kin, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  connection.query(sql, [full_name, date_of_birth, medical_condition, gender, address, contact, next_of_kin, admission_date], (err, result) => {
    if (err) {
      console.error(err);
      req.flash('error', 'Error adding patient.');
      return res.redirect('/addPatient');
    }

    req.flash('success', 'Patient added successfully!');
    res.redirect('/addPatient');
  });
});

// !!! Start of Edit Patient !!! FREDERICK ==================================================== //

// Get edit patient 
app.get('/editpage/:patient_id', checkAuthenticated, checkAdmin, (req, res) => {
  const patient_id = req.params.patient_id;
  const sql = 'SELECT * FROM patient WHERE patient_id = ?';

  connection.query(sql, [patient_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error retrieving patient.');
    }

    if (results.length > 0) {
      res.render('editpage', { 
        patient: results[0],
        user: req.session.user
      });
    } else {
      res.status(404).send('Patient not found.');
    }
  });
});


// Post edit patient 
app.post('/editpage/:patient_id', checkAuthenticated, checkAdmin, (req, res) => {
  const patient_id = req.params.patient_id;
  const { full_name, date_of_birth, medical_condition, gender, address, contact, next_of_kin, admission_date } = req.body;

  if (!full_name || !date_of_birth || !medical_condition || !gender || !address || !contact || !next_of_kin || !admission_date) {
    return res.status(400).send('All fields are required.');
  }

  const sql = 'UPDATE patient SET full_name = ?, date_of_birth = ?, medical_condition = ?, gender = ?, address = ?, contact = ?, next_of_kin = ?, admission_date = ? WHERE patient_id = ?';
  connection.query(sql, [full_name, date_of_birth, medical_condition, gender, address, contact, next_of_kin, admission_date, patient_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error updating patient.');
      
    }
    res.redirect('/patientList');
  });``
});

// !!! Start of Delete Patient !!! JAZIRI ============================================================= //

// Delete patient 
app.post('/deletePatient/:patient_id', checkAuthenticated, checkAdmin, (req, res) => {
  const patient_id = req.params.patient_id;
  const sql = 'DELETE FROM patient WHERE patient_id = ?';

  connection.query(sql, [patient_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error deleting patient.');
    }
    res.redirect('/patientList');
  });
});

// !!! Start of Search Patient !!! NICHOLAS ============================================================= //
//Search patient
app.get('/search', checkAuthenticated, (req, res) => {
  const patient_id = req.query.patient_id;

  if (!patient_id) {
    return res.render('search', {users: req.session.user, q: '', patients: []});
  }

  const sql = 'SELECT * FROM patient WHERE patient_id = ?';

  connection.query(sql, [patient_id], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Server Error");
    }

    
    res.render('search', {users: req.session.user, patients: results, q: patient_id });
  });
});



// !!! Start of 404 Error Handling !!! //
app.use((req, res) => {
  res.status(404).send('404 Not Found');
});

// Run server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

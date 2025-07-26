const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const app = express();

const connection = mysql.createConnection({
    host: 's5d-75.h.filess.io',
    user: 'c237Disable_attackwife',
    password: '',
    database: 'c237Disable_attackwife' 
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
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
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
    if (req.session.user.role === 'admin') {
        return next();
    } else {
        req.flash('error', 'Access denied');
        res.redirect('/');
    }
};

const validateRegistration = (req, res, next) => {
    const { username, email, password, address, contact} = req.body;

    if (!username || !email || !password || !address || !contact) {
        return res.status(400).send('All fields are required.');
    }

    if (password.length < 6) {
        req.flash('error', 'Password should be at least 6 or more characters long');
        req.flash('formData', req.body);
        return res.redirect('/register');
    }
    next();
};

app.get('/', (req, res) => {
    res.render('index', { user: req.session.user });
});

app.get('/register', (req, res) => {
    res.render('register', {
        messages: req.flash('error'),
        formData: req.flash('formData')[0]
    });
});

app.post('/register', validateRegistration, (req, res) => {
    const { username, email, password, address, contact} = req.body;

    const sql = 'INSERT INTO users (username, email, password, address, contact) VALUES (?, ?, SHA1(?), ?, ?)';
    connection.query(sql, [username, email, password, address, contact], (err, result) => {
        if (err) throw err;
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    });
});

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
        if (err) throw err;

        if (results.length > 0) {
            req.session.user = results[0];
            req.flash('success', 'Login successful!');
            res.redirect('/addPerson');
        } else {
            req.flash('error', 'Invalid email or password.');
            res.redirect('/login');
        }
    });
});

//Frederick's in progress
app.get('/editpage/:id',checkAuthenticated, checkAdmin,(req,res)=>{
    const patient_id=req.params.id;
    const sql ='SELECT * FROM patient WHERE patient_id=?';
    //Fetech data from mysql based on the patient ID
    connection.query(sql,[patient_id],(error,results)=>{
        if(error){
            console.error('Database query error:',error.message);
            return res.status(500).send('Error retrieving patient by ID');

        }
        //check if any patient with the given ID was found
        if (results.length>0) {
            //render HTML pagewith the patient data
            res.render('editpage',{patient:results[0]});
        } else{
            //If no patient with the given ID was found, render a 404 page ot handle it accordingly
            res.status(404).send('patient not found')
        }
    })
})

app.post('/editPatient/:id',checkAuthenticated, checkAdmin,(req, res) => {
    const patient_id = req.params.id;   
    //Extract patient data from the request body
    const{full_name, date_of_birth, gender, address, contact, next_of_kin} =req.body;
    const sql = 'UPDATE patient SET full_name =?, date_of_birth=?, gender=?, address=?, contact=?, next_of_kin=?, image =? WHERE patient_id =?';

    //Insert the new patient into the database
    connection.query(sql,[full_name, date_of_birth, gender, address, contact, next_of_kin, patient_id], (error,results) =>{
        if (error){
            //handle any error that occurs during the database operation
            console.error("Error updating patient:", error);
            res.status(500).send('Error updating patient');
        }else{
            //send a success response
            res.redirect('/');
        }
    })
})




//Khine's
app.get('/addPatient', checkAuthenticated, checkAdmin, (req, res) => {
    res.render('addPatient', { user: req.session.user });
});

app.post('/addPatient', checkAuthenticated, checkAdmin, (req, res) => {
    const { full_name, date_of_birth, gender, address, contact, next_of_kin } = req.body;

    const sql = `INSERT INTO disable_people (full_name, date_of_birth, gender, address, contact, next_of_kin)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    connection.query(sql, [full_name, date_of_birth, gender, address, contact, next_of_kin], (error, result) => {
        if (error) {
            console.error('Error inserting person:', error);
            res.status(500).send('Error adding person');
        } else {
            res.redirect('/addPatient');
        }
    });
});

//Nicholas's Search Function
app.get('/Search', (req, res) => {
  const patientId = req.query.id;

  if (!patientId) {
    return res.render('search', {});
  }

  const sql = 'SELECT * FROM patients WHERE patient_id = ?';

  connection.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (results.length > 0) {
      res.render('search', { patient: results[0] });
    } else {
      res.render('search', { notFound: true });
    }
  });
});

app.get('/patients/:id', (req, res) => {
  const patientId = req.params.id;

  const sql = 'SELECT * FROM patients WHERE patient_id = ?';

  connection.query(sql, [patientId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database server error');
    }

    if (results.length === 0) {
      return res.status(404).send('Patient not found');
    }

    res.render('patient', { patient: results[0] });
  });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const morgan = require('morgan');
const app = express();
const fs = require('fs');

const path = require('path');
const bodyParser = require('body-parser');

const mongoose = require('mongoose');
const Models = require('./models.js');
const Movies = Models.Movie;
const Users = Models.User;
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'});
// mongoose.connect('mongodb://localhost:27017/myFlixDB', {
//     useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(morgan('combined', {stream: accessLogStream}));
app.use(express.static('public'));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cors = require('cors');
let allowOrgins = [ 'http://localhost:8080', 'http://localhost:1234', 'https://movie-dash.herokuapp.com/','https://movie-dash.herokuapp.com/login','https://movie-dash.netlify.app','http://localhost:4200'];
app.use(cors({
    origin: (origin, callback) =>{
        if(!origin) return callback(null, true);
        if(allowOrgins.indexOf === -1) {
            let message = 'The CORS policy for this application doesn\'t allow access from origin ' + origin;
            return callback(new Error(message), false);
        }
        return callback(null,true);
    }
}));

let auth = require('./auth.js')(app);
const passport = require('passport');
require('./passport');
const { check, validationResult } = require('express-validator');



app.get('/', (req, res) => {
  res.send("Welcome to my movie app where you can find movies that were the most popular when they came out");
});

//CREATE NEW USERS & USERS ID 
app.post('/users', [
    //validation 
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
],

 async (req, res) => {

    try {
        let errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(422).json({errors: errors.array()})
        }
        let hashedPassword = Users.hashPassword(req.body.Password);

        const { Username, Name, Password, Email, Birthday } = req.body;

        const findUser = await Users.findOne({ Username });
        if (findUser) {
            throw `${Username} already exists`;
        }
        const newUser = new Users({
            Name,
            Username,
            Password: hashedPassword,
            Email,
            Birthday: Birthday
        });
        const saveUser = await newUser.save();
        if (!saveUser) {
            throw 'Failed to save the user';
        }
        return res.status(200).json(saveUser);
    } catch(error) {
        res.status(400).send('Error: ' + error)
    } 
});

//GET ALL OF THE USERS
app.get('/users', passport.authenticate('jwt', {session: false}), async(req, res) => {
    try{
    const users = await Users.find()
      if (users) {
        res.status(201).json(users);
      }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      };
  });

//GET USER BY USERNAME 
app.get('/users/:Username', passport.authenticate('jwt', {session: false}), async (req, res) => {
    try {
        const {Username} = req.params;

    const user = await Users.findOne({Username});

      if(user) {
        res.status(201).json(user);
      }else{
        throw `${Username} can't be found`;
      }
    } catch(err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      };
  });
  

//UPDATE USERS NAME 
app.put('/users/:Username',[
    //validation 
    check('Username', 'Username is required').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
],

 (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()){
        return res.status(422).json({errors: errors.array()})
    }
    let hashedPassword = Users.hashPassword(req.body.Password);

    Users.findOneAndUpdate({Username: req.params.Username}, 
        { $set: {
        Name: req.body.Name,
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        Birthday: req.body.Birthday
        }
    },
    { new:true},
    (error,updatedUser) => {
        if(error) {
            console.error(error);
            res.status(201).send( 'error: ' + error);
        } else {
            res.json(updatedUser);
        }
    });
});

//POST A MOVIE TO A USERS ARRAY OF FAVORITE MOVIES
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session: false}), (req, res) => {
Users.findOneAndUpdate({Username: req.params.Username},
    { 
        $push: {FavoriteMovies: req.params.MovieID}
    },
    {new: true},
    (error, UpdatedUser) => {
        if(error){
            console.log(error);
            res.status(201).send('error: ' + error);
        } else{
            res.json(UpdatedUser);
        }
    });
});

//DELETE A MOVIE FROM THE USERS ARRAY OF FAVORITE MOVIES
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session: false}), (req, res) => {
    Users.findOneAndUpdate({Username: req.params.Username},
        {
            $pull: {FavoriteMovies: req.params.MovieID}
        },
        {new: true},

        (error, UpdatedUser) =>{
            if(error) {
                console.error(error);
                res.status(500).send('error: ' + error);
            } else{
                res.json(UpdatedUser);
            }
        });  
})

//DELETE USERS 
app.delete('/users/:Username', passport.authenticate('jwt', {session: false}),  async (req, res) => {
    try {
    const {Username} = req.params;

    const user = await Users.findOneAndRemove({Username});

      if(!user) {
          throw `${Username} was not found`;
        } else {
          res.status(200).json(`${Username} was deleted.`);
        }
    } catch(err)  {
        console.error(err);
        res.status(500).send('Error: ' + err);
      };
  });

//READ ALL OF THE MOVIES IN THE DATABASE
app.get('/movies',passport.authenticate('jwt', {session: false}), async (req, res) => {
    try {
        const movies = await Movies.find()

          if (movies) {
            res.status(201).json(movies);
          }
        } catch (err) {
            console.error(err);
            res.status(500).send('Error: ' + err);
          };
      });

//READ MOVIES BY THE TITLE 
app.get('/movies/:Title', passport.authenticate('jwt', {session: false}), async (req, res) => {
    try {
        const {Title} = req.params;

    const movie = await Movies.findOne({Title});

      if(movie) {
        res.status(201).json(movie);
      }else {
        throw  `${Title} can't be found`;
      }

    } catch(err) {
        console.error(err);
        res.status(500).send('Error: ' + err);
      };
  });

//GET A GENRE BY NAME 
app.get('/movies/Genre/:Name', passport.authenticate('jwt', {session: false}), (req, res) => {
    Movies.findOne({ 'Genre.Name': req.params.Name})
    .then((movies) => {
        res.json(movies.Genre);
    }) 
    .catch((error) => {
        console.error(error);
        res.status(500).send('error: ' + error);
    }) 
}) 

//GET DIRECTOR BY NAME 
app.get('/movies/Director/:Name', passport.authenticate('jwt', {session: false}), (req, res) => {
    Movies.findOne({'Director.Name': req.params.Name})
    .then((movies) => {
        res.json(movies.Director);
    })
    .catch ((error) => {
        console.error(error);
        res.status(500).send('error: ' + error);
    })
})

app.get('/documentation', (_req, res) => {
  res.sendFile('public/documentation.html', {root: __dirname});
});

app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

  const port = process.env.PORT || 8080;
  app.listen(port, '0.0.0.0',() => {
   console.log('Listening on Port ' + port);
  });



  
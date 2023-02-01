const express = require('express');
const morgan = require('morgan');
const app = express();
const fs = require('fs');

const path = require('path');
const bodyParser = require('body-parser');
const uuid = require('uuid');

const mongoose = require('mongoose');
const Models = require('./models.js');
const Movies = Models.Movie;
const Users = Models.User;
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'});
mongoose.connect('mongodb://localhost:27017/myFlixDB', {
    useNewUrlParser: true, useUnifiedTopology: true});

app.use(morgan('combined', {stream: accessLogStream}));
app.use(express.static('public'));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let auth = require('./auth.js')(app);
const passport = require('passport');
require('./passport');


app.get('/', (req, res) => {
  res.send("Welcome to my movie app where you can find movies that were the most popular when they came out");
});

//CREATE NEW USERS & USERS ID 
app.post('/users', async (req, res) => {
    try {
        const { Username, Name, Password, Email, Birthday } = req.body;

        const findUser = await Users.findOne({ Username });
        if (findUser) {
            throw `${Username} already exists`;
        }
        const newUser = new Users({
            Name,
            Username,
            Password,
            Email,
            Birthday: Birthday
        });
        const saveUser = await newUser.save();
        if (!saveUser) {
            throw 'Failed to save the user';
        }
        return res.status(201).json(saveUser);
    } catch(error) {
        res.status(400).send('Error: ' + error)
    } 
});

//GET ALL OF THE USERS
app.get('/users', passport.authenticate('jwt', {session: false}), (req, res) => {
    Users.find()
      .then((users) => {
        res.status(201).json(users);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//GET USER BY USERNAME 
app.get('/users/:Username', passport.authenticate('jwt', {session: false}), (req, res) => {
    Users.findOne({ Username: req.params.Username })
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });
  

//UPDATE USERS NAME 
app.put('/users/:Username', (req, res) => {
    Users.findOneAndUpdate({Username: req.params.Username}, 
        { $set: {
        Name: req.body.Name,
        Username: req.body.Username,
        Password: req.body.Password,
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
app.delete('/users/:Username', passport.authenticate('jwt', {session: false}), (req, res) => {
    Users.findOneAndRemove({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.Username + ' was not found');
        } else {
          res.status(200).send(req.params.Username + ' was deleted.');
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  });

//READ ALL OF THE MOVIES IN THE DATABASE
app.get('/movies', passport.authenticate('jwt', {session: false}), (_req, res) => {
    Movies.find()
    .then((movies) => {
        res.status(201).json(movies);
    })
    .catch((error) =>{
        console.error(error);
        res.status(500).send('error:' + error);
    });
})

//READ MOVIES BY THE TITLE 
app.get('/movies/:Title', passport.authenticate('jwt', {session: false}), (req, res) => {
    Movies.findOne({Title: req.params.Title})
    .then((movie) => {
        res.json(movie);
    }) 
    .catch((error) =>{
        console.error(error);
        res.status(500).send('error: ', error);
    })
})

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

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});

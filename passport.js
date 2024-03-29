const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Models = require('./models.js');
const passportJWT = require('passport-jwt');

let Users = Models.User;
let JWTStrategy = passportJWT.Strategy;
let ExtractJWT = passportJWT.ExtractJwt;

passport.use(new LocalStrategy ({ 
    usernameField: 'Username',
    passwordField: 'Password'
}, (username, password, callback) => {
        console.log(username + ' ' + password);
        Users.findOne({ Username: username }, (error, user) => {
            if (error) {
                console.log(error);
                return callback(error);
            }

            if (!user) {
                console.log('incorrect username');
                return callback(null, false, { message: 'Incorrect username' });
            }

            if(!user.validatePassword(password)) {
                console.log('Incorrect Password');
                return callback(null, false, {message: 'Incorrect Password'});
            }

            console.log('finished');
            return callback(null, user);
        });
    })); 

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
    secretOrKey: 'your_jwt_secret'
  }, async (jwtPayload, callback) => {
        try {
            const user = await Users.findById(jwtPayload._id);
            return callback(null, user);
        } catch (error) {
            return callback(error);
        }
    }));
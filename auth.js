const jwtsecret = 'your_jwt_secret';
const jwt = require('jsonwebtoken');
const passport = require('passport');

require('./passport.js');


/**
 * @param {string} user 
 * @returns {*} jwtsecret
 * this will return a randomized token for the user that will expire in 7 days.
 */

let generateJWTToken = (user) => {
    return jwt.sign(user, jwtsecret, {
        subject: user.Username,
        expiresIn: '7d',
        algorithm: 'HS256'
    });
}

/**
 * 
 * @param {*} router 
 * @returns {user, jwtsecret}
 * this will create a token once the user has created an account and trying to log in.
 */

module.exports = (router) => {
    router.post('/login', (req, res) => {
        passport.authenticate('local', { session: false }, (error, user, info) => {

            if (error || !user) {
                return res.status(400).json({
                    message: 'something isn\'t right',
                    user: user
                });
            }
            req.login(user, { session: false }, (error) => {
                if (error) {
                    res.send(error);
                }
                let token = generateJWTToken(user.toJSON());
                return res.json({ user, token });
            });
        })(req, res);
    });
}
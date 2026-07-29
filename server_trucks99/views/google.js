require('dotenv').config();

const express = require('express');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');

const googleRouter = express.Router();

//imports the user mongoose model
const User = require('../schema/user');

//creates a strategy to authenticate google accounts (only when credentials are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL_ORIGIN + "/api/auth/google/redirect"
    },
        function (accessToken, refreshToken, profile, cb) {
            //find the user if DB if not present then save the usernameField
            User.findOrCreate({ googleId: profile.id }, { name: profile.displayName, provider: 'google' }, (error, user) => {
                return cb(error, user);
            });
        }
    ));
}

//this authenticates using google strategy and get user profile and email in return
googleRouter.get('/', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ message: 'Google login is not configured' });
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

//redirect url after google authentication
googleRouter.get('/redirect', (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) return res.redirect('/api/auth/google/fail');
    passport.authenticate('google', { failureRedirect: '/api/auth/google/fail' })(req, res, next);
}, (req, res) => {
    // Successful authentication, redirect to client application
    res.redirect(process.env.CLIENT_URL);
});

//handles failed authentication from google
googleRouter.get('/fail', (req, res) => {
    res.status(401).json('Failed authentication!');
});


module.exports = googleRouter; 
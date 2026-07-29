require('dotenv').config();

const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

//hadle github signup routes
const githubRouter = express.Router();

//import user mongoose model
const User = require('../schema/user');

//creates a strategy to authenticate github accounts (only when credentials are set)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL_ORIGIN + "/api/auth/github/redirect",
        passReqToCallback: true, // req object on auth is passed as first arg
        scope: ['user:email'], // fetches non-public emails as well
    },
        function (req, accessToken, refreshToken, profile, done) {
            // find user by profile if not present in DB then create it
            User.findOrCreate({ githubId: profile.id }, { name: profile.displayName, provider: 'github' }, function (err, user) {
                return done(err, user);
            });
        }
    ));
}

//this authenticates using github strategy and get user profile and email in return
githubRouter.get('/', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) return res.status(503).json({ message: 'GitHub login is not configured' });
    passport.authenticate('github')(req, res, next);
});

//redirect url after gitub authentication
githubRouter.get('/redirect', (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) return res.redirect('/api/auth/github/fail');
    passport.authenticate('github', { failureRedirect: '/api/auth/github/fail' })(req, res, next);
}, function (req, res) {
    // Successful authentication, redirect home.
    res.redirect(process.env.CLIENT_URL);
});

//handles failed authentication from github
githubRouter.get('/fail', (req, res) => {
    res.status(401).json({ message: 'Authentication failed with github' });
});


module.exports = githubRouter;


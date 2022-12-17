const express = require('express');
const { ObjectId } = require('mongodb');
const { getUserByEmail } = require('../data/users');
const { sync } = require('../helpers');
const router = express.Router();

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        // Placeholder, login with just an email
        res.send(`<form method="POST"><label>Email</label><input type="string" name="email">@stevens.edu<br><input type="submit"></form>`);
    }))
    .post(sync(async (req, res) => { // Validate credentials, setup session
        // Placeholder, login with just an email
        const user = await getUserByEmail(`${req.body.email}@stevens.edu`);
        req.session.userId = user._id;
        req.session.manager = user.is_manager;
        req.session.admin = user.is_admin;
        // Redirect to original destination
        res.redirect(req.session.redirect || '/');
    }));

module.exports = router;

const express = require('express');
const { ObjectId } = require('mongodb');
const { getUserByEmail } = require('../data/users');
const { sync } = require('../helpers');
const router = express.Router();

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        // Placeholder, login with just a number
        // change input type back to number
        res.send(`<form method="POST"><label>Student #</label><input type="text" name="num"><input type="submit"></form>`);
    }))
    .post(sync(async (req, res) => { // Validate credentials, setup session
        // Placeholder, login with just a number
        //put 'student' back in front of $ on next line
        const user = await getUserByEmail(`${req.body.num}@stevens.edu`);
        req.session.userId = user._id;
        // Redirect to original destination
        res.redirect(req.session.redirect || '/');
    }));

module.exports = router;

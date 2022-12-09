const express = require('express');
const { ObjectId } = require('mongodb');
const { getUserByEmail } = require('../data/users');
const { sync } = require('../helpers');
const router = express.Router();

router
    .route('/register')
    .get(sync(async (req, res) => { // Display register form
        res.render(`userRegister`);
    }))
    .post(sync(async (req, res) => { // Validate credentials, setup session
        // Placeholder, register with just a number
        const user = await getUserByEmail(`student${req.body.num}@stevens.edu`);
        req.session.userId = user._id;
        // Redirect to original destination
        res.redirect(req.session.redirect || '/');
    }));

module.exports = router;

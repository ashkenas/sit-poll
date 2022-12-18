const express = require('express');
const { getUserByEmail, validateUser } = require('../data/users');
const { validate } = require('../validation')
const { statusError, sync } = require('../helpers');
const router = express.Router();
const bcrypt = require('bcryptjs')

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        res.render('login');
    }))
    .post(validate(['email', 'password']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        const { email, password } = req.body;
        const user = await getUserByEmail(`${email.toLowerCase()}@stevens.edu`);
        if(user === null)
            throw statusError(400, "Either the username or password is invalid.");
        if(!(await bcrypt.compare(password, user.pass_hash))) 
            throw statusError(400, "Either the username or password is invalid.");

        if((await validateUser(`${email}@stevens.edu`, password)).authenticatedUser) {
            req.session.userId = user._id;
            req.session.manager = user.is_manager;
            req.session.admin = user.is_admin;
            // Redirect to original destination
            return res.json({redirect: req.session.redirect || '/'});
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

module.exports = router;

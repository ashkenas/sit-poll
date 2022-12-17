const express = require('express');
const { getUserByEmail, validateUser } = require('../data/users');
const { validate } = require('../validation')
const { statusError, sync } = require('../helpers');
const router = express.Router();
const bcrypt = require('bcrypt')

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        res.render('login')
    }))
    .post(validate(['email', 'password']), sync(async (req, res) => { // Validate credentials, setup session
        const {email, password} = req.body
        const user = await getUserByEmail(email.toLowerCase());
        if(user === null)
            throw statusError(400, "Either the username or password is invalid") 
        if(!await bcrypt.compare(password, user.pass_hash)) 
            throw statusError(400, "Either the username or password is invalid")

        try {
            if(JSON.stringify(await validateUser(email, password)) === JSON.stringify({authenticatedUser: true})) {
                req.session.userId = user._id;
                req.session.manager = user.is_manager;
                req.session.admin = user.is_admin;
                // Redirect to original destination
                return res.json({redirect: req.session.redirect || '/'});
            }
            else {
                throw statusError(500, "Internal server error.")
            }
        } catch (e) {
            throw statusError(400, e)
        }
    }));

module.exports = router;

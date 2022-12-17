const express = require('express');
const { getUserByEmail, createUser } = require('../data/users');
const { validate } = require('../validation')
const { sync } = require('../helpers');
const router = express.Router();
const bcrypt = require('bcrypt')

const errorObject = function(code, message) {
    return {error: code,
            message: message};
}

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        res.render('register')
    }))
    .post(validate(['email', 'password']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        const {email, password} = req.body
        if(!email.match(/^[a-z]*[0-9]@stevens.edu$/i) || email.length > 8)
            return res.render("register", errorObject(400, "Invalid Stevens email address"))
        if(password.match(/\s/g))
            return res.render("register", errorObject(400, "Password must not contain spaces"))
        if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g) || !password.match(/[\.,'";:\?!@#\$%\^&\*-\+]/g))
            return res.render("register", errorObject(400, "Password must be at least six characters and contain an uppercase letter, a digit, and a special character"))    
        const user = await getUserByEmail(email.toLowerCase());
        if(user)
            return res.render("register", errorObject(400, "User already exists"))  

        try {
            if(JSON.stringify(await createUser(email, password)) === JSON.stringify({authenticatedUser: true})) {
                req.session.userId = user._id;
                req.session.manager = user.is_manager;
                req.session.admin = user.is_admin;
                // Redirect to original destination
                return res.redirect(req.session.redirect || '/');
            }
            else {
                return res.render("register", errorObject(500, "Internal server error."))
            }
        } catch (e) {
            return res.render("register",  errorObject(400, e))
        }
    }));

module.exports = router;
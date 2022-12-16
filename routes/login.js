const express = require('express');
const { getUserByEmail, validateUser } = require('../data/users');
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
        res.render('login')
    }))
    .post(validate(['email', 'password']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        const {email, password} = req.body
        const user = await getUserByEmail(email.toLowerCase());
        if(user === null)
            return res.render("login", errorObject(400, "Either the username or password is invalid"))  
        if(!await bcrypt.compare(password, user.pass_hash)) 
            return res.render("login", errorObject(400, "Either the username or password is invalid"))  

        try {
            if(JSON.stringify(await validateUser(email, password)) === JSON.stringify({authenticatedUser: true})) {
                req.session.userId = user._id;
                req.session.manager = user.is_manager;
                req.session.admin = user.is_admin;
                // Redirect to original destination
                return res.redirect(req.session.redirect || '/');
            }
            else {
                return res.render("login", errorObject(500, "Internal server error."))
            }
        } catch (e) {
            return res.render("login",  errorObject(400, e))
        }
    }));

module.exports = router;

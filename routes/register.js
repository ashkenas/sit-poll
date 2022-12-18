const express = require('express');
const { getUserByEmail, createUser } = require('../data/users');
const { validate, validMajors, validSchools, validGenders } = require('../validation');
const { sync, statusError } = require('../helpers');
const router = express.Router();

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        res.render('register', {
            majors: validMajors,
            schools: validSchools,
            genders: validGenders
        });
    }))
    .post(validate(
        ['email', 'password', 'display_name', 'class_year', 'major', 'gender', 'school', 'date_of_birth']
    ), sync(async (req, res) => { // Validate credentials, setup session
        const email = req.body.email.toLowerCase();
        if(!email.match(/^[a-z]{3,}[0-9]*$/))
            throw statusError(400, "Invalid Stevens email address.");
        const password = req.body.password;
        if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g) || !password.match(/[!-\/:-@\[-`]/g) || password.match(/\s/g))
            throw statusError(400, "Password must be at least six characters and contain no spaces, an uppercase letter, a digit, and a special character.");
        
        const display_name = req.body.display_name;
        if(display_name.length < 2)
            throw 'Display name must be at least 2 characters long.';
        if(display_name.match(/[^a-z.'\-]/i))
            throw 'Display name can only contain letters, periods, and apostrophes.';
        if(!validGenders.includes(req.body.gender))
            throw 'Invalid gender.';
        if(!validSchools.includes(req.body.school))
            throw 'Invalid school.';
        if(!validMajors.includes(req.body.major))
            throw 'Invalid major.';
        const class_year = req.body.class_year;
        const thisYear = (new Date()).getFullYear();
        if(class_year < thisYear || class_year >= thisYear + 8)
            throw 'Invalid class year';
        const date_of_birth = req.body.date_of_birth;
        if(date_of_birth > new Date())
            throw 'Cannot be born in the future.';
        if((new Date() - date_of_birth) < 1000*60*60*24*365*17)
            throw 'Must be at least 17 years old.'

        const user = await getUserByEmail(email);
        if (user)
            throw statusError(400, "An account with that email exists already.");  

        const result = await createUser(
            email,
            password,
            display_name,
            req.body.major,
            req.body.school,
            req.body.gender,
            class_year,
            date_of_birth
        );

        if(result.insertedUser) {
            req.session.userId = result.insertedUser;
            req.session.manager = false;
            req.session.admin = false;
            // Redirect to original destination
            res.json({ redirect: req.session.redirect || '/' });
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

module.exports = router;
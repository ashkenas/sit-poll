const express = require('express');
const { getUserByEmail, createUser, getUserById } = require('../data/users');
const { validate, validMajors, validSchools, validGenders } = require('../validation');
const { updatePassword, updateDisplayName, updateGender } = require('../data/editProfile');
const { sync, statusError } = require('../helpers');
const router = express.Router();

router
    .route('/')
    .get(sync(async (req, res) => { // Display current information
        const user = await getUserById(req.session.userId);
        res.render('editProfile', {
            id: req.session.userId,
            displayName: user.display_name,
            DOB: user.date_of_birth,
            classYear: user.class_year,
            gender: user.gender,
            major: user.major,
            school: user.school
        });
    }))

router
    .route('/changePassword/:id')
    .get(sync(async (req, res) => {
        const user = await getUserById(req.session.userId);
        console.log('hey')
        res.render('profile/editPassword');
    }))
    .post(validate(['password']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        const password = req.body.password;
        if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g) || !password.match(/[!-\/:-@\[-`]/g))
            throw statusError(400, "Password must be at least six characters and contain an uppercase letter, a digit, and a special character.");

        const user = await getUserById(req.session.userId); 

        const result = await updatePassword(req.session.userId, password);

        if(result.updatedUser) {
            // Redirect
            res.redirect('/editProfile');
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

router
    .route('/changeDisplayName/:id')
    .get(sync(async (req, res) => {
        const user = await getUserById(req.session.userId);
        res.render('profile/editName', {
            id: req.session.userId
        });
    }))
    .post(validate(['display_name']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        const display_name = req.body.display_name;
        if(display_name.length < 2)
            throw 'Display name must be at least 2 characters long.';
        if(display_name.match(/[^a-z.' \-]/i))
            throw 'Display name can only contain letters, periods, spaces, and apostrophes.';
        
        const user = await getUserById(req.session.userId);

        const result = await updateDisplayName(req.session.userId, display_name);

        if(result.updatedUser) {
            // Redirect
            res.redirect('/editProfile');
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

router
    .route('/changeGender/:id')
    .get(sync(async (req, res) => {
        const user = await getUserById(req.session.userId);
        res.render('profile/editGender', {
            id: req.session.userId,
            genders: validGenders
        });
    }))
    .post(validate(['gender']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        console.log('change gender');
        const gender = req.body.gender;
        
        const user = await getUserById(req.session.userId);

        const result = await updateGender(req.session.userId, gender);

        if(result.updatedUser) {
            // Redirect
            console.log('updated');
            res.redirect('/editProfile');
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

module.exports = router;
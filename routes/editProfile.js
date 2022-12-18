const express = require('express');
const { getUserByEmail, createUser, getUserById } = require('../data/users');
const { validate, validMajors, validSchools, validGenders } = require('../validation');
const { updatePassword, updateDisplayName, updateGender, updateMajorAndSchool } = require('../data/editProfile');
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
        const gender = req.body.gender;
        
        const user = await getUserById(req.session.userId);

        const result = await updateGender(req.session.userId, gender);

        if(result.updatedUser) {
            // Redirect
            res.redirect('/editProfile');
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

router
    .route('/changeMajor/:id')
    .get(sync(async (req, res) => {
        const user = await getUserById(req.session.userId);
        res.render('profile/editMajor', {
            id: req.session.userId,
            majors: validMajors,
            schools: validSchools
        });
    }))
    .post(validate(['major', 'school']), sync(async (req, res) => { // Validate credentials (TODO: Not present?), setup session
        const major = req.body.major;
        const school = req.body.school;
        
        const user = await getUserById(req.session.userId);

        if (user.major === major) {
            throw `User already a ${major} major`;
        }

        const result = await updateMajorAndSchool(req.session.userId, major, school);

        if(result.updatedUser) {
            // Redirect
            res.redirect('/editProfile');
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

module.exports = router;
const express = require('express');
const { getUserById } = require('../data/users');
const { validate, validMajors, validSchools, validGenders } = require('../validation');
const { updateUser } = require('../data/').users;
const { sync, statusError } = require('../helpers');
const router = express.Router();

router
    .route('/')
    .get(sync(async (req, res) => { // Display current information
        const user = await getUserById(req.session.userId);
        res.render('editProfile', {
            user: user,
            genders: validGenders,
            schools: validSchools,
            majors: validMajors
        });
    }))
    .post(validate(
        ['display_name', 'gender', 'school', 'class_year', 'major', 'date_of_birth']
    ), sync(async (req, res) => { // Update profile
        const display_name = req.body.display_name;
        if(display_name.length < 2)
            throw 'Display name must be at least 2 characters long.';
        if(display_name.match(/[^a-z.'\- ]/i))
            throw 'Display name can only contain letters, periods, spaces, and apostrophes.';
        if(!validGenders.includes(req.body.gender))
            throw 'Invalid gender.';
        if(!validSchools.includes(req.body.school))
            throw 'Invalid school.';
        if(!validMajors.includes(req.body.major))
            throw 'Invalid major.';
        const class_year = req.body.class_year;
        const thisYear = (new Date()).getFullYear();
        if((class_year < thisYear || class_year >= thisYear + 8) && class_year !== 0)
            throw 'Invalid class year';
        const date_of_birth = req.body.date_of_birth;
        if(date_of_birth > new Date())
            throw 'Cannot be born in the future.';
        if((new Date() - date_of_birth) < 1000*60*60*24*365*17)
            throw 'Must be at least 17 years old.'

        const result = await updateUser(
            req.session.userId,
            display_name,
            class_year,
            date_of_birth,
            req.body.gender,
            req.body.school,
            req.body.major
        );

        if(result.success) {
            res.json({ redirect: '/' });
        } else {
            throw statusError(500, "Internal server error.");
        }
    }));

module.exports = router;
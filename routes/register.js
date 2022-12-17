const express = require('express');
const { getUserByEmail, createUser } = require('../data/users');
const { validate } = require('../validation')
const { statusError, sync } = require('../helpers');
const router = express.Router();
const bcrypt = require('bcrypt');
const { dbConnection } = require('../config/mongoConnection');

router
    .route('/')
    .get(sync(async (req, res) => { // Display login form
        res.render('register')
    }))
    .post(validate(['email', 'password', 'display_name', 'major', 'school', 'gender', 'date_of_birth', 'class_year']), sync(async (req, res) => { 
        // Validate credentials, setup session
        const {email, password, display_name, major, school, gender, date_of_birth, class_year} = req.body
        if(!email.match(/^[a-z]+\d*@stevens\.edu$/i) || email.substring(0, email.indexOf('@')).length > 8)
           throw statusError(400, "Invalid Stevens email address")
        if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g)
        || !password.match(/[\.,'";:\?!@#\$%\^&\*-\+]/g) || password.match(/\s/g))
            throw statusError(400, "Password must be at least six characters and contain no spaces, an uppercase letter, a digit, and a special character")    
        
        const user = await getUserByEmail(email.toLowerCase());
        if(user)
            throw statusError(400, "User already exists") 

        if(!/^[a-zA-Z\-]{3,} [a-zA-Z\-,\.']{3,}$/.test(display_name) || /[\-']{2,}/g.test(display_name)) 
            throw statusError(400, "Invalid name")

            const majors = ["biomedical engineering", "chemical engineering", "civil engineering", "computer engineering", "electrical engineering",
            "engineering - naval engineering concentration", "engineering - optical engineering concentration", "mechanical engineering", "biology",
            "chemistry", "chemical biology", "pure and applied mathematics", "physics", "computer science", "cybersecurity", "accounting and analytics",
            "business and technology", "economics", "finance", "information systems", "management", "marketing innovation and analytics", 
            "quantitative finance", "engineering management", "industrial and systems engineering", "software engineering", "music and technology", 
            "visual arts and technology", "science, technology, and society", "quantitative social science", "science communication", "literature",
            "philosophy", "engineering undecided", "humanities undecided"]
         if(majors.indexOf(major.toLowerCase()) === -1)
            throw statusError(400, "Invalid major. Give the full name if you haven't done so.")

        const schools = ["Schaefer School of Engineering and Science", "School of Business", "School of Systems and Enterprises", "College of Arts and Letters"]
        if(schools.indexOf(school) === -1)
            throw statusError(400, "Inavlid school")

        const genders = ['M', 'F', 'T', 'NB', 'GN', 'O', 'P']
        if(genders.indexOf(gender) === -1)
            throw statusError(400, "Invalid gender")

        if(date_of_birth.getTime() > (new Date).getTime())
            throw statusError(400, "Invalid date of birth")

        const years = [2022, 2023, 2024, 2025, 2026]
        if(years.indexOf(class_year) === -1)
            throw statusError(400, "Invalid graduation year")

        try {
            if(JSON.stringify(await createUser(email, password, display_name, major, school, gender, date_of_birth, class_year)) === JSON.stringify({insertedUser: true})) {
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
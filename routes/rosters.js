const express = require('express');
const { validate, requireOptions, requireString } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { title } = require('process');
const { create } = require('express-handlebars');
const { getUserById } = data.users;
const { getRostersByUserId, createRoster, deleteRoster, addPersonToRoster, removePersonFromRoster } = data.rosters;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
        const user = await getUserById(req.session.userId);
        console.log(user);
        const rosters = await getRostersByUserId(req.session.userId)
        console.log(rosters);
        console.log(user.rosters);
        res.render('rosters/displayRosters', {
          rosters: await getRostersByUserId(req.session.userId)
        });
        /* if((req.session.manager && user.is_manager) || (req.session.admin && user.is_admin)) {
          res.render('rosters/displayRosters', {
            rosters: user.rosters
          });
        } else {
          res.render('error', {
            status: 403,
            message: "Unauthorized to access this page"
          });
        } */
    }))

router
    .route('/createRoster')
    .get(sync(async (req, res) => { // Render form to create a roster
      //todo: redirect to handlebar upon button click with form to create a roster
      const user = getUserById(req.session.userId);
      res.render('rosters/createRoster');
      /* if((req.session.manager && user.is_manager) || (req.session.admin && user.is_admin)) {
        res.render('rosters/createRoster');
      } else {
        res.render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      } */
    }))
    .post(sync(async (req, res) => { // Create roster
        let {titleInput, studentEmailInput, assistantEmailInput} = req.body;
        //todo: xss
        titleInput = requireString(titleInput, 'Title');
        studentEmailInput = studentEmailInput.split(',');
        studentEmailInput = requireOptions(studentEmailInput, 'Student Emails');
        if(!assistantEmailInput.trim()) {
          assistantEmailInput = [];
        } else {
          assistantEmailInput = assistantEmailInput.split(',');
          assistantEmailInput = requireOptions(assistantEmailInput, 'Assistant Emails');
        }
        const updatedUser = await createRoster(req.session.userId, titleInput, studentEmailInput, assistantEmailInput);
        //const user = getUserById(req.session.userId);
        //user.rosters.push(roster);
        //console.log(updatedUser.rosters);
        res.redirect('/rosters');
        /* res.render('rosters/displayRosters', {
          rosters: updatedUser.rosters
        }); */
    }));

module.exports = router;

const express = require('express');
const { validate, requireOptions, requireString, requireId, requireEmails } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { title } = require('process');
const { create } = require('express-handlebars');
//const { getRosterById } = require('../data/rosters');
const { getUserById } = data.users;
const { getRostersByUserId, getRosterById, createRoster, deleteRoster, 
  addPersonToRoster, removePersonFromRoster, updateRosterLabel } = data.rosters;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
        const user = await getUserById(req.session.userId);
        const rosters = await getRostersByUserId(req.session.userId)
        return res.render('rosters/displayRosters', {
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
      return res.render('rosters/createRoster');
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
        return res.redirect('/rosters');
    }));

router
    .route('/edit/title/:rosterId')
    .get(sync(async (req, res) => { // Render form to create a roster
      // todo: render edit page
      
      //const user = await getUserById(req.session.userId);
      // todo: check the rosterid is valid

      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);
      return res.render('rosters/editRosterTitle', {
        rosterLabel: roster.label,
        rosterId: req.params.rosterId
      });
      
      // todo: check to make sure roster is owned by user logged in

    }))
    .patch(sync(async (req, res) => { 
      
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.params.rosterId);
      
      let {titleInput} = req.body;
      //todo: xss
      titleInput = requireString(titleInput, 'Title');
      try {
        const updatedRoster = await updateRosterLabel(req.session.userId, req.params.rosterId, titleInput);
      } catch (e) {
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        })
      }
      const user = await getUserById(req.session.userId);
      return res.render('rosters/displayRosters', {
        rosters: user.rosters
      });
    }))


router
    .route('/edit/add/:rosterId')
    .get(sync(async (req, res) => { // Render form to create a roster
      // todo: render edit page
      
      //const user = await getUserById(req.session.userId);
      // todo: check the rosterid is valid

      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);
      return res.render('rosters/addStudents', {
        rosterLabel: roster.label,
        rosterId: req.params.rosterId
      });
      
      // todo: check to make sure roster is owned by user logged in

    }))
    .patch(sync(async (req, res) => { 
      
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.params.rosterId);
      
      let {studentEmailInput, category} = req.body;
      //todo: xss
      studentEmailInput = requireString(studentEmailInput, 'Email(s)');
      studentEmailInput = requireEmails(studentEmailInput.split(','), 'Email(s)');
      category = requireString(category, 'category');

      try {
        const updatedRoster = await addPersonToRoster(req.session.userId, req.params.rosterId, studentEmailInput, category);
      } catch (e) {
        console.log(e);
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        })
      }
      const user = await getUserById(req.session.userId);
      return res.render('rosters/displayRosters', {
        rosters: user.rosters
      });
    }))

router
    .route('/delete/:rosterId')
    .get(sync(async (req, res) => {
      // todo: make sure this roster belongs to current user
      // todo: ask user if this is really what they want to do
      
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);
      return res.render('rosters/deleteRoster', {
        rosterLabel: roster.label,
        students: roster.students,
        assistants: roster.assistants,
        rosterId: req.params.rosterId
      });

    }))
    .delete(sync(async (req, res) => { 
      console.log('in delete');
      // todo: delete current roster
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await deleteRoster(req.params.rosterId);

      const user = await getUserById(req.session.userId);
      return res.render('rosters/displayRosters', {
        rosters: user.rosters
      });
    }))

module.exports = router;

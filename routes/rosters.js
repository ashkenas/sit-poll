const express = require('express');
const xss = require('xss');
const Papa = require('papaparse');
const { validate, checkCategory, requireString, requireId, requireEmail, requireEmails } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getRostersByUserId, getRosterById, createRoster, deleteRoster, 
  addPersonToRoster, removePersonFromRoster, updateRosterLabel } = data.rosters;

// todo: double check error throwing and xss calls

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
      if(req.session.manager || req.session.admin) {
        return res.render('rosters/displayRosters', {
          rosters: await getRostersByUserId(req.session.userId)
        });
      } else {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
    }));

router
    .route('/createRoster')
    .get(sync(async (req, res) => { // Render form to create a roster
      if(req.session.manager || req.session.admin) {
        return res.render('rosters/createRoster');
      } else {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
    }))
    .post(sync(async (req, res) => { // Create roster
      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      let {hiddenRosterLabel, hiddenCSVString, hiddenAssistantEmails} = req.body;
      
      //todo: xss
      hiddenRosterLabel = requireString(hiddenRosterLabel, 'Title');
      hiddenCSVString = requireString(hiddenCSVString, 'CSV Upload');
      hiddenAssistantEmails = requireString(hiddenAssistantEmails, 'hiddenAssistantEmails');
      hiddenRosterLabel = xss(hiddenRosterLabel);
      hiddenCSVString = xss(hiddenCSVString);
      hiddenAssistantEmails = xss(hiddenAssistantEmails);
      hiddenAssistantEmails = requireEmails(hiddenAssistantEmails.split(','), 'Assistant Emails');

      const parsed = Papa.parse(hiddenCSVString);
      if(parsed.errors.length > 0) throw statusError(400, 'Cannot parse uploaded file');

      const emailIndex = parsed.data[0].indexOf('SIS Login ID');
      if(emailIndex === -1) throw statusError(400, 'Not a Stevens CSV file');
      let studentEmails = parsed.data.map((student) => {
          return requireEmail(student[emailIndex]);
      });

      studentEmails = studentEmails.filter((email) => {
        return email !== null;
      })
      
      const updatedUser = await createRoster(req.session.userId, hiddenRosterLabel, studentEmails, hiddenAssistantEmails);
      return res.redirect('/rosters');
    }));

router
    .route('/createManualRoster')
    .get(sync(async (req, res) => { // Render form to create a roster
      if(req.session.manager || req.session.admin) {
        return res.render('rosters/createRoster');
      } else {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
    }))
    .post(sync(async (req, res) => { // Create roster
      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      let {titleInput, studentEmailInput, assistantEmailInput} = req.body;
      //todo: xss

      titleInput = requireString(titleInput, 'title');
      studentEmailInput = requireString(studentEmailInput, 'studentEmailInput');
      assistantEmailInput = requireString(assistantEmailInput, 'assistantEmailInput');
      titleInput = xss(titleInput);
      studentEmailInput = xss(studentEmailInput);
      assistantEmailInput = xss(assistantEmailInput);
      studentEmailInput = requireEmails(studentEmailInput.split(','), 'Student Emails');
      assistantEmailInput = requireEmails(assistantEmailInput.split(','), 'Assistant Emails');
      const updatedUser = await createRoster(req.session.userId, titleInput, studentEmailInput, assistantEmailInput);
      return res.redirect('/rosters');
    }));

router
    .route('/edit/title/:rosterId')
    .get(sync(async (req, res) => { // Render form to edit a roster title
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.session.userId, req.params.rosterId);

      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      
      return res.render('rosters/editRosterTitle', {
        rosterLabel: roster.label,
        rosterId: req.params.rosterId
      });
    }))
    .patch(sync(async (req, res) => { 
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.session.userId, req.params.rosterId);

      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      
      let {titleInput} = req.body;
      //todo: xss
      titleInput = requireString(titleInput, 'Title');
      titleInput = xss(titleInput);
      
      const updatedRoster = await updateRosterLabel(req.session.userId, req.params.rosterId, titleInput);
      return res.redirect('/rosters');
    }));

router
    .route('/edit/add/:rosterId')
    .get(sync(async (req, res) => { // Render form to add people to a roster
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.session.userId, req.params.rosterId);

      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }

      return res.render('rosters/addStudents', {
        rosterLabel: roster.label,
        rosterId: req.params.rosterId
      });
    }))
    .patch(sync(async (req, res) => { 
      
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.session.userId, req.params.rosterId);

      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      
      let {studentEmailInput, category} = req.body;
      //todo: xss
      studentEmailInput = requireString(studentEmailInput, 'Email(s)');
      studentEmailInput = xss(studentEmailInput);
      studentEmailInput = requireEmails(studentEmailInput.split(','), 'Email(s)');
      category = checkCategory(category, 'category');
      category = xss(category);

      const updatedRoster = await addPersonToRoster(req.session.userId, req.params.rosterId, studentEmailInput, category);
      return res.redirect('/rosters');
    }));

router
    .route('/edit/:rosterId/remove/:studentEmail')
    .get(sync(async (req, res) => { // Render form to remove student from a roster
      req.params.studentEmail = requireEmail(req.params.studentEmail, 'student email');
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.session.userId, req.params.rosterId);

      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }

      return res.render('rosters/deleteStudent', {
        rosterLabel: roster.label,
        rosterId: req.params.rosterId,
        studentEmail: req.params.studentEmail
      });

    }))
    .patch(sync(async (req, res) => { 
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.session.userId, req.params.rosterId);
      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      req.params.studentEmail = requireEmail(req.params.studentEmail, 'student email');
      let category = '';
      if(roster.assistants.includes(req.params.studentEmail)) {
        category = 'assistants';
      } else {
        category = 'students';
      }

      const updatedRoster = await removePersonFromRoster(req.session.userId, req.params.rosterId, req.params.studentEmail, category);
      return res.redirect('/rosters');
    }));

router
    .route('/delete/:rosterId')
    .get(sync(async (req, res) => {
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.session.userId, req.params.rosterId);
      if(!(req.session.manager || req.session.admin)) {
        return res.status(13).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      return res.render('rosters/deleteRoster', {
        rosterLabel: roster.label,
        students: roster.students,
        assistants: roster.assistants,
        rosterId: req.params.rosterId
      });

    }))
    .delete(sync(async (req, res) => {
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await deleteRoster(req.params.rosterId);

      if(!(req.session.manager || req.session.admin)) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      return res.redirect('/rosters');
    }));

module.exports = router;

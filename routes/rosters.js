const express = require('express');
const xss = require('xss');
const Papa = require('papaparse');
const { validate, checkCategory, requireString, requireId, requireEmail, requireEmails } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { title } = require('process');
const { create } = require('express-handlebars');
const { getUserById } = data.users;
const { getRostersByUserId, getRosterById, createRoster, deleteRoster, 
  addPersonToRoster, removePersonFromRoster, updateRosterLabel } = data.rosters;

// todo: double check error throwing and xss calls

const checkAuthorized = async (userId) => {
  userId = requireId(userId);
  const user = await getUserById(userId);
  //return true;
  //todo: uncomment when we can authorize
  return (userId.manager && user.is_manager) || (userId.admin && user.is_admin);
}

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
      if(await checkAuthorized(req.session.userId)) {
        return res.render('rosters/displayRosters', {
          rosters: await getRostersByUserId(req.session.userId)
        });
      } else {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
    }));

router
    .route('/createRoster')
    .get(sync(async (req, res) => { // Render form to create a roster
      if(await checkAuthorized(req.session.userId)) {
        return res.render('rosters/createRoster');
      } else {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
    }))
    .post(sync(async (req, res) => { // Create roster
      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
      let {hiddenRosterLabel, hiddenCSVString, hiddenAssistantEmails} = req.body;
      
      //todo: xss
      xss(hiddenRosterLabel);
      xss(hiddenCSVString);
      xss(hiddenAssistantEmails);
      try {
        hiddenRosterLabel = requireString(hiddenRosterLabel, 'Title');
        hiddenCSVString = requireString(hiddenCSVString, 'CSV Upload');
        if(!hiddenAssistantEmails) {
          hiddenAssistantEmails = [];
        } else {
          hiddenAssistantEmails = requireEmails(hiddenAssistantEmails.split(','), 'Assistant Emails');
        }

        const parsed = Papa.parse(hiddenCSVString);
        if(parsed.errors.length > 0) throw statusError(400, 'Cannot parse uploaded file');

        const emailIndex = parsed.data[0].indexOf('SIS Login ID');
        if(emailIndex === -1) throw statusError(400, 'Not a Stevens CSV file');
        let studentEmails = parsed.data.map((student) => {
          try {
            return requireEmail(student[emailIndex]);
          } catch (e) {
            return null;
          }
        });

        studentEmails = studentEmails.filter((email) => {
          return email !== null;
        })
        
        const updatedUser = await createRoster(req.session.userId, hiddenRosterLabel, studentEmails, hiddenAssistantEmails);
        return res.redirect('/rosters');
      } catch (e) {
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        });
      }  
    }));

router
    .route('/createManualRoster')
    .get(sync(async (req, res) => { // Render form to create a roster
      if(await checkAuthorized(req.session.userId)) {
        return res.render('rosters/createRoster');
      } else {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
    }))
    .post(sync(async (req, res) => { // Create roster
      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
      let {titleInput, studentEmailInput, assistantEmailInput} = req.body;
      //todo: xss
      xss(titleInput);
      xss(studentEmailInput);
      xss(assistantEmailInput);
      try {
        titleInput = requireString(titleInput, 'Title');
        studentEmailInput = requireEmails(studentEmailInput.split(','), 'Student Emails');
        if(!assistantEmailInput.trim()) {
          assistantEmailInput = [];
        } else {
          assistantEmailInput = requireEmails(assistantEmailInput.split(','), 'Assistant Emails');
        }
        const updatedUser = await createRoster(req.session.userId, titleInput, studentEmailInput, assistantEmailInput);
        return res.redirect('/rosters');
      } catch (e) {
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        });
      }  
    }));

router
    .route('/edit/title/:rosterId')
    .get(sync(async (req, res) => { // Render form to edit a roster title
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
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
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
      
      let {titleInput} = req.body;
      //todo: xss
      xss(titleInput);
      
      try {
        titleInput = requireString(titleInput, 'Title');
        const updatedRoster = await updateRosterLabel(req.session.userId, req.params.rosterId, titleInput);
      } catch (e) {
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        })
      }
      return res.redirect('/rosters');
    }));

router
    .route('/edit/add/:rosterId')
    .get(sync(async (req, res) => { // Render form to add people to a roster
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
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
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
      
      let {studentEmailInput, category} = req.body;
      //todo: xss
      xss(studentEmailInput);
      xss(category);
      studentEmailInput = requireString(studentEmailInput, 'Email(s)');
      studentEmailInput = requireEmails(studentEmailInput.split(','), 'Email(s)');
      category = checkCategory(category, 'category');

      try {
        const updatedRoster = await addPersonToRoster(req.session.userId, req.params.rosterId, studentEmailInput, category);
      } catch (e) {
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        })
      }
      return res.redirect('/rosters');
    }));

router
    .route('/edit/:rosterId/remove/:studentEmail')
    .get(sync(async (req, res) => { // Render form to remove student from a roster
      req.params.studentEmail = requireEmail(req.params.studentEmail, 'student email');
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
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
      const roster = await getRosterById(req.params.rosterId);
      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
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

      try {
        const updatedRoster = await removePersonFromRoster(req.session.userId, req.params.rosterId, req.params.studentEmail, category);
      } catch (e) {
        return res.status(e.status).render('error', {
          status: e.status,
          message: e.message
        })
      }
      return res.redirect('/rosters');
    }));

router
    .route('/delete/:rosterId')
    .get(sync(async (req, res) => {
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);
      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(13).render('error', {
          status: 401,
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

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(401).render('error', {
          status: 401,
          message: "Unauthorized to access this page"
        });
      }
      return res.redirect('/rosters');
    }));

module.exports = router;

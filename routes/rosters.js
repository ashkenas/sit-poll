const express = require('express');
const xss = require('xss');
const { validate, requireOptions, requireString, requireId, requireEmail, requireEmails } = require('../validation');
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

// todo: double check error throwing and xss calls

const checkAuthorized = async (userId) => {
  try {
    const user = await getUserById(userId);
    return true;
    //todo: uncomment when we can authorize
    //return (userId.manager && user.is_manager) || (userId.admin && user.is_admin);
  } catch (e) {
    return res.status(e.status).render('error', {
      status: e.status,
      message: e.message
    });
  }
}

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
      if(await checkAuthorized(req.session.userId)) {
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
      if(await checkAuthorized(req.session.userId)) {
        return res.render('rosters/createRoster');
      } else {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
    }))
    .post(sync(async (req, res) => { // Create roster
      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(403).render('error', {
          status: 403,
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
    .get(sync(async (req, res) => { // Render form to create a roster
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
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
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(403).render('error', {
          status: 403,
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
      const user = await getUserById(req.session.userId);
      return res.render('rosters/displayRosters', {
        rosters: user.rosters
      });
    }));

router
    .route('/edit/add/:rosterId')
    .get(sync(async (req, res) => { // Render form to create a roster
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
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
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      
      let {studentEmailInput, category} = req.body;
      //todo: xss
      xss(studentEmailInput);
      xss(category);
      studentEmailInput = requireString(studentEmailInput, 'Email(s)');
      studentEmailInput = requireEmails(studentEmailInput.split(','), 'Email(s)');
      category = requireString(category, 'category');

      try {
        const updatedRoster = await addPersonToRoster(req.session.userId, req.params.rosterId, studentEmailInput, category);
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
    }));

router
    .route('/edit/:rosterId/remove/:studentEmail')
    .get(sync(async (req, res) => { // Render form to create a roster
      req.params.studentEmail = requireEmail(req.params.studentEmail, 'student email');
      req.params.rosterId = requireId(req.params.rosterId, 'roster id');
      const roster = await getRosterById(req.params.rosterId);

      if(!(await checkAuthorized(req.session.userId))) {
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
      const roster = await getRosterById(req.params.rosterId);
      if(!(await checkAuthorized(req.session.userId))) {
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

      try {
        const updatedRoster = await removePersonFromRoster(req.session.userId, req.params.rosterId, req.params.studentEmail, category);
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
    }));

router
    .route('/delete/:rosterId')
    .get(sync(async (req, res) => {
      req.params.rosterId = requireId(req.params.rosterId);
      const roster = await getRosterById(req.params.rosterId);
      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(403).render('error', {
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

      if(!(await checkAuthorized(req.session.userId))) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }

      const user = await getUserById(req.session.userId);
      return res.render('rosters/displayRosters', {
        rosters: user.rosters
      });
    }));

module.exports = router;

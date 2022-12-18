const express = require('express');
const xss = require('xss');
const { validate, requireOptions, requireString, requireId, requireEmail, requireEmails } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getUserById, getUserByEmail } = data.users;
const { getAdmins, getManagers, addAuth, removeAuth } = data.admin;

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
      if(req.session.admin) {
        return res.render('admin/displayAuthorizations', {
          managers: await getManagers(),
          admins: await getAdmins()
        });
      } else {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
    }));

router
    .route('/add/:auth')
    .get(sync(async (req, res) => { // Render form to add an authorized person
      req.params.auth = requireString(req.params.auth);
      if(!req.session.admin) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      if(req.params.auth === 'manager') {
        auth = 'is_manager';
      } else if(req.params.auth === 'admin') {
        auth = 'is_admin';
      } else {
        throw statusError(404, 'route not found');
      }
      return res.render('admin/addAuth', {
        auth: req.params.auth
      });
    }))
    .patch(sync(async (req, res) => {
      req.params.auth = requireString(req.params.auth);
      if(!req.session.admin) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      
      let {authEmailInput} = req.body;
      //todo: xss
      authEmailInput = requireEmail(authEmailInput, 'email');
      authEmailInput = xss(authEmailInput);

      const user = await getUserByEmail(authEmailInput);
      if(user === null) throw statusError(404, 'User not found');
      let auth;
      if(req.params.auth === 'manager') {
        auth = 'is_manager';
      } else if(req.params.auth === 'admin') {
        auth = 'is_admin';
      } else {
        throw statusError(404, 'route not found');
      }
      const update = await addAuth(user._id, auth);
      return res.redirect('/admin');
    }));

router
    .route('/remove/:auth/:userEmail')
    .get(sync(async (req, res) => { // Render form to remove authorization from a person
      req.params.auth = requireString(req.params.auth);
      req.params.userEmail = requireEmail(req.params.userEmail);
      if(!req.session.admin) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }
      if(req.params.auth === 'manager') {
        auth = 'is_manager';
      } else if(req.params.auth === 'admin') {
        auth = 'is_admin';
      } else {
        throw statusError(404, 'route not found');
      }
      // check that auth is manager or admin
      return res.render('admin/removeAuth', {
        auth: req.params.auth,
        email: req.params.userEmail
      });
    }))
    .patch(sync(async (req, res) => {
      req.params.auth = requireString(req.params.auth);
      req.params.userEmail = requireEmail(req.params.userEmail);
      if(!req.session.admin) {
        return res.status(403).render('error', {
          status: 403,
          message: "Unauthorized to access this page"
        });
      }

      const user = await getUserByEmail(req.params.userEmail);
      if(user === null) throw statusError(404, 'User not found');
      let auth;
      if(req.params.auth === 'manager') {
        auth = 'is_manager';
      } else if(req.params.auth === 'admin') {
        auth = 'is_admin';
      } else {
        throw statusError(404, 'route not found');
      }
      const update = await removeAuth(user._id, auth);
      return res.redirect('/admin');
    }));

module.exports = router;
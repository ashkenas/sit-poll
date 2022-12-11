const express = require('express');
const { validate } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getUserById } = data.users;
const { getRostersByUserId, createRoster, deleteRoster, addPersonToRoster, removePersonFromRoster } = data.rosters;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .get(sync(async (req, res) => { // View rosters
        //todo: render handlebar of rosters for user
        //const user = getUserById(req.session.userId)
        res.render('rosters/rosters' /* pass relevant information */);
    }))
    .post(sync(async (req, res) => { // Create roster
        //todo: redirect to handlebar upon button click with form to create a roster
        notImplemented(res);
    }));

module.exports = router;

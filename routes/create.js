const express = require('express');
const router = express.Router();
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getUserById } = data.users;

router
    .route('/')
    .get(sync(async (req, res) => {
        if (!req.session.manager && !req.session.admin)
            throw statusError(403, 'Not authorized to create polls.')

        const user = await getUserById(req.session.userId);
        const rosters = user.rosters.map(roster => {
            return {
                _id: roster._id.toString(),
                label: roster.label
            };
        });

        res.render('polls/pollCreate', { rosters: rosters });
    }));

module.exports = router;

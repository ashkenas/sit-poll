const express = require('express');
const { validate } = require('../validation');
const router = express.Router();
const path = require('path');

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .post(async (req, res) => { // Create poll
        notImplemented(res);
    });

router
    .route('/:id')
    .get(validate(), async (req, res) => { // Get voting page for poll
        // At this point, req.params.id is a valid ObjectId
        res.render('polls/vote', { options: ['A', 'B', 'C'] })
    })
    .post(validate(['vote']), async (req, res) => { // Vote on poll
        // At this point, req.params.id is a valid ObjectId
        // At this point, req.body.vote is a valid number
        // Vote logic into database would go here
        // Now that the vote has been processed, tell the webpage to redirect the user
        res.json({ redirect: path.join(req.originalUrl, 'results') });
    })
    .put(async (req, res) => { // Update poll
        notImplemented(res);
    })
    .delete(async (req, res) => { // Delete poll
        notImplemented(res);
    });

router
    .route('/:id/edit')
    .get(async (req, res) => { // Edit page for poll
        notImplemented(res);
    });

router
    .route('/:id/results')
    .get(async (req, res) => { // Results page for poll
        res.send('TODO: results page');
    });

router
    .route('/:id/comment')
    .post(async (req, res) => { // Create comment on poll
        notImplemented(res);
    });

router
    .route('/:id/react')
    .post(async (req, res) => { // Leave reaction on poll
        notImplemented(res);
    });

module.exports = router;

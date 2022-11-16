const express = require('express');
const { validate } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const { requirePoll, getPollInfoById, getPollResults, voteOnPoll } = require('../data').polls;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .post(async (req, res) => { // Create poll
        notImplemented(res);
    });

router
    .use('/:id', requirePoll('id')) // Automatically 404s for all methods if necessary
    .route('/:id')
    .get(sync(async (req, res) => { // Get voting page for poll
        res.render('polls/vote', { poll: await getPollInfoById(req.params.id) });
    }))
    .post(validate(['vote']), sync(async (req, res) => { // Vote on poll
        const poll = await getPollInfoById(req.params.id);
        const vote = req.body.vote;
        if (vote < 0 || vote >= poll.choices.length)
            throw statusError(400, 'Vote choice out-of-bounds.');
        if (poll.close_date < Date.now())
            throw statusError(400, 'Poll is closed, cannot vote.');
        await voteOnPoll(req.params.id, req.session.userId, vote);
        // Now that the vote has been processed, tell the webpage to redirect the user
        res.json({ redirect: path.join(req.originalUrl, 'results') });
    }))
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
    .use('/:id/results', requirePoll('id')) // Automatically 404s for all methods if necessary
    .route('/:id/results')
    .get(sync(async (req, res) => { // Results page for poll
        const poll = await getPollResults(req.params.id);
        res.json(poll.choices.map((choice, i) => {
            return {
                choice: choice,
                count: poll.votes[i]
            };
        }));
    }));

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

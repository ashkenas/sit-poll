const express = require('express');
const { validate } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getUserById } = data.users;
const { getVote, addComment, requirePoll, getPollInfoById, getPollResults, voteOnPoll } = data.polls;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .get(sync(async (req, res) => { // View polls
        notImplemented(res);
    }))
    .post(sync(async (req, res) => { // Create poll
        notImplemented(res);
    }));

router
    .use('/:id', requirePoll('id')) // Automatically 404s for all methods if necessary
    .route('/:id')
    .get(sync(async (req, res) => { // Get voting page for poll
        const poll = await getPollInfoById(req.params.id);
        res.render('polls/vote', {
            poll: poll,
            author: (await getUserById(poll.author)).display_name,
            lastVote: await getVote(req.params.id, req.session.userId)
        });
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
    .put(sync(async (req, res) => { // Update poll
        notImplemented(res);
    }))
    .delete(sync(async (req, res) => { // Delete poll
        notImplemented(res);
    }));

router
    .route('/:id/edit')
    .get(sync(async (req, res) => { // Edit page for poll
        notImplemented(res);
    }));

router
    .use('/:id/results', requirePoll('id')) // Automatically 404s for all methods if necessary
    .route('/:id/results')
    .get(sync(async (req, res) => { // Results page for poll
        const vote = await getVote(req.params.id, req.session.userId);
        if (vote === null)
            return res.redirect(`/polls/${req.params.id.toString()}`);
        const poll = await getPollResults(req.params.id);
        res.render('polls/results', {
            poll: poll,
            vote: vote,
            author: (await getUserById(poll.author)).display_name,
        });
    }));

router
    .route('/:id/comment')
    .post(validate(['comment']), sync(async (req, res) => { // Create comment on poll
        await addComment(req.params.id, req.session.userId, req.body.comment);
        res.json({ redirect: path.join(req.originalUrl, '..', 'results') });
    }));

router
    .route('/:id/comment/:commentId')
    .delete(sync(async (req, res) => { // Delete comment on poll
        notImplemented(res);
    }));

router
    .route('/:id/react')
    .post(sync(async (req, res) => { // Leave reaction on poll
        notImplemented(res);
    }));

module.exports = router;

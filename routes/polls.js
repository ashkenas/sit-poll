const express = require('express');
const { validate, validReactions } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getUserById } = data.users;
const { addComment, deleteComment, deleteReaction, getAllPollsInfo, getComment, getPollInfoById, getPollResults, getVote, getReaction, reactOnPoll, requirePoll, voteOnPoll } = data.polls;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .get(sync(async (req, res) => { // View polls
        // Update this with an actual page
        res.json(await getAllPollsInfo(req.session.userId));
    }))
    .post(sync(async (req, res) => { // Create poll
        notImplemented(res);
    }));

router
    .use('/:id', requirePoll('id')) // Automatically 404s for all methods if necessary
    .route('/:id')
    .get(sync(async (req, res) => { // Get voting page for poll
        const poll = await getPollInfoById(req.params.id);
        if (poll.close_date < Date.now())
            return res.redirect(`/polls/${req.params.id.toString()}/results`);
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
            throw statusError(403, 'Poll is closed, cannot vote.');
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
        const poll = await getPollResults(req.params.id);
        if (vote === null && poll.close_date > Date.now())
            return res.redirect(`/polls/${req.params.id.toString()}`);
        if (req.accepts('html')) {
            res.render('polls/results', {
                poll: poll,
                vote: vote,
                userId: req.session.userId.toString(),
                reaction: await getReaction(req.params.id, req.session.userId),
                author: (await getUserById(poll.author)).display_name,
            });
        } else { // Requested via ajax, give json result
            res.json({
                votes: poll.votes,
                reactions: poll.reactions,
                comments: poll.comments,
                vote: vote,
                reaction: await getReaction(req.params.id, req.session.userId),
                userId: req.session.userId.toString()
            });
        }
    }));

router
    .route('/:id/comments')
    .post(validate(['comment']), sync(async (req, res) => { // Create comment on poll
        await addComment(req.params.id, req.session.userId, req.body.comment);
        res.json({ redirect: path.join(req.originalUrl, '..', 'results') });
    }))
    .delete(validate(['_id']), sync(async (req, res) => { // Delete comment on poll
        const comment = await getComment(req.params.id, req.session.userId, req.body._id);
        if (!comment) throw statusError(400, 'Comment does not exist, cannot delete.');
        if (!comment.user.equals(req.session.userId))
            throw statusError(403, 'Cannot delete comment left by another user.');

        await deleteComment(req.params.id, req.session.userId, req.body._id);
        res.redirect(`/polls/${req.params.id.toString()}/results`);
    }));

router
    .route('/:id/reaction')
    .post(validate(['reaction']), sync(async (req, res) => { // Leave reaction on poll
        if (!validReactions.includes(req.body.reaction))
            throw statusError(400, 'Invalid reaction.');
        await reactOnPoll(req.params.id, req.session.userId, req.body.reaction)
        res.json({ success: true });
    }))
    .delete(sync(async (req, res) => { // Delete reaction on poll
        if (await getReaction(req.params.id, req.session.userId) === null)
            throw statusError(403, 'No reaction to delete.');
        await deleteReaction(req.params.id, req.session.userId);
        res.json({ success: true });
    }));

module.exports = router;

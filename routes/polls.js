const express = require('express');
const { validate, validReactions, requireId } = require('../validation');
const router = express.Router();
const path = require('path');
const { statusError, sync } = require('../helpers');
const data = require('../data');
const { getUserById } = data.users;
const { addComment, createPoll, deleteComment, deleteReaction, getAllPollsInfo, getComment, getPollInfoById, getPollMetrics, getPollResults, getVote, getReaction, reactOnPoll, requirePoll, voteOnPoll } = data.polls;

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

// Automatically 404/3s for all poll-specific routes if necessary
router.use('/:id', requirePoll('id'))

router
    .route('/')
    .get(sync(async (req, res) => { // View polls
        const polls = await getAllPollsInfo(req.session.userId);
        
        for (const poll of polls)
            poll.author = (await getUserById(poll.author)).display_name;

        res.render("polls/viewPolls", { polls: polls });
    }))
    .post(validate(
        ['title', 'choices', 'close_date'],
        { roster: requireId }
    ), sync(async (req, res) => { // Create poll
        const close_date = req.body.close_date.getTime();
        if (close_date < Date.now())
            throw statusError(400, 'Close date must be after current date.');
        if (req.body.choices.length < 2)
            throw statusError(400, 'Poll must have at least 2 options.');
        if (req.body.title.length < 5)
            throw statusError(400, 'Title must be at least 5 characters long');

        const stat = await createPoll(
            req.body.title,
            req.body.choices,
            req.session.userId,
            req.session.admin,
            close_date,
            req.body.roster
        );

        if (stat.success)
            res.json({ redirect: `/polls/${stat.pollId}/results` });
        else    
            throw statusError(500, 'Failed to create poll.');
    }));

router
    .route('/:id')
    .get(sync(async (req, res) => { // Get voting page for poll
        const poll = await getPollInfoById(req.params.id);
        if (poll.close_date < Date.now() || req.session.manager || req.session.admin)
            return res.redirect(`/polls/${req.params.id.toString()}/results`);
        res.render('polls/vote', {
            poll: poll,
            author: (await getUserById(poll.author)).display_name,
            lastVote: await getVote(req.params.id, req.session.userId)
        });
    }))
    .post(validate(['vote']), sync(async (req, res) => { // Vote on poll
        if (req.session.manager || req.session.admin)
            throw statusError(403, 'Only students can vote on polls.');
        const poll = await getPollInfoById(req.params.id);
        const vote = req.body.vote;
        if (vote < 0 || vote >= poll.choices.length)
            throw statusError(400, 'Vote choice out-of-bounds.');
        if (poll.close_date < Date.now())
            throw statusError(403, 'Poll is closed, cannot vote.');
        await voteOnPoll(req.params.id, req.session.userId, vote);
        res.updateClients(req.params.id.toString(), 'votes',
            (await getPollResults(req.params.id)).votes
        );
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
    .route('/:id/results')
    .get(sync(async (req, res) => { // Results page for poll
        const vote = await getVote(req.params.id, req.session.userId);
        const poll = await getPollResults(req.params.id);
        if (vote === null && poll.close_date > Date.now() && !req.session.manager && !req.session.admin)
            return res.redirect(`/polls/${req.params.id.toString()}`);

        res.render('polls/results', {
            poll: poll,
            vote: vote === null ? -1 : vote,
            userId: req.session.userId,
            reaction: await getReaction(req.params.id, req.session.userId),
            author: (await getUserById(poll.author)).display_name,
        });
    }));
    
router
    .route('/:id/metrics')
    .get(sync(async (req, res) => { // Results page for poll
        const poll = await getPollResults(req.params.id);
        if (!((req.session.manager && !poll.public) || req.session.admin))
                throw statusError(403, 'Permission denied.');

        res.render('polls/metrics', {
            poll: poll,
            author: (await getUserById(poll.author)).display_name,
            metrics: await getPollMetrics(req.params.id)
        });
    }));

router
    .route('/:id/comments')
    .post(validate(['comment']), sync(async (req, res) => { // Create comment on poll
        res.updateClients(req.params.id.toString(), 'newComment', {
            ...(await addComment(req.params.id, req.session.userId, req.body.comment)),
            display_name: (await getUserById(req.session.userId)).display_name
        });
        res.json({ redirect: path.join(req.originalUrl, '..', 'results') });
    }))
    .delete(validate(['_id']), sync(async (req, res) => { // Delete comment on poll
        const comment = await getComment(req.body._id);
        if (!comment) throw statusError(400, 'Comment does not exist, cannot delete.');
        if (!(comment.user.equals(req.session.userId) || req.session.manager || req.session.admin))
            throw statusError(403, 'Cannot delete comment left by another user.');

        await deleteComment(req.body._id);
        res.updateClients(req.params.id.toString(), 'deleteComment', req.body._id.toString());
        res.redirect(`/polls/${req.params.id.toString()}/results`);
    }));

router
    .route('/:id/reaction')
    .post(validate(['reaction']), sync(async (req, res) => { // Leave reaction on poll
        if (!Object.keys(validReactions).includes(req.body.reaction))
            throw statusError(400, 'Invalid reaction.');
        await reactOnPoll(req.params.id, req.session.userId, req.body.reaction)
        res.updateClients(req.params.id.toString(), 'reactions',
            (await getPollResults(req.params.id)).reactions
        );
        res.json({ success: true });
    }))
    .delete(sync(async (req, res) => { // Delete reaction on poll
        const reaction = await getReaction(req.params.id, req.session.userId);
        if (reaction === null)
            throw statusError(403, 'No reaction to delete.');
        await deleteReaction(req.params.id, req.session.userId);
        res.updateClients(req.params.id.toString(), 'deleteReaction', reaction);
        res.json({ success: true });
    }));

module.exports = router;

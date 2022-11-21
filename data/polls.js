const { ObjectId } = require("mongodb");
const { polls, users } = require("../config/mongoCollections");
const { stringifyId, statusError, sync } = require("../helpers");
const { requireId, requireInteger } = require("../validation");
const { getUserById } = require("./users");

const pollExists = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id }, { project: { _id: 1 } });
    return poll !== null;
};

/**
 * Middleware that gaurantees poll existence. Also
 * validates that the current user can view it.
 * @param {string} id Request parameter to check for id
 */
const requirePoll = (id) => sync(async (req, res, next) => {
    req.params[id] = requireId(req.params[id], id);
    const exists = await pollExists(req.params[id]);
    if (!exists) // Make sure poll exists
        throw statusError(404, 'Poll not found.');

    if (req.session.admin) // Admins can always see
        return next();

    if ((await getPollById(req.params[id])).public) // Poll is public
        return next();

    const usersCol = await users();
    if (req.session.manager) { // Check if the user manages this poll
        const manager = await usersCol.findOne({
            _id: req.session.userId,
            rosters: { $elemMatch: { polls: req.params[id] } }
        });
        if (manager) return next();
    }
    const manager = await usersCol.findOne({
        rosters: { $elemMatch: {
            students: (await getUserById(req.session.userId)).email,
            polls: req.params[id]
        } }
    });
    if (manager) // User has been assigned this poll
        return next();
    throw statusError(403, 'Permission denied.');
});

const getPollInfoById = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne(
        { _id: id },
        { project: { votes: 0, comments: 0, reactions: 0 } }
    );
    return poll ? stringifyId(poll) : null;
};

const getPollById = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id });
    if (!poll) return null;

    // poll.votes = poll.votes.map(stringifyId);
    // poll.reactions = poll.reactions.map(stringifyId);
    // poll.comments = poll.comments.map(stringifyId);
    return stringifyId(poll);
};

const getPollResults = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne(
        { _id: id },
        { project: { votes: 0, reactions: 0 } }
    );
    if (!poll) return null;

    const votes = (await pollsCol.aggregate([
        { $match: { _id: id } },
        { $unwind: { path: '$votes' } },
        { $group: { _id: '$votes.vote', count: { $count: {} } } }
    ]).toArray()).reduce((prev, curr) => (prev[poll.choices[curr._id]] = curr.count, prev), {});

    poll.votes = poll.choices.map((choice) => {
        return {
            choice: choice,
            votes: votes[choice] || 0
        };
    });

    poll.reactions = (await pollsCol.aggregate([
        { $match: { _id: id } },
        { $unwind: { path: '$reactions' } },
        { $group: { _id: '$reactions.reaction', count: { $count: {} } } }
    ]).toArray()).map((reaction) => { return { reaction: reaction._id, count: reaction.count }; });

    poll.comments = poll.comments.map(stringifyId);

    return stringifyId(poll);
};

const getVote = async (pollId, userId) => {
    pollId = requireId(pollId, 'pollId');
    if (!(await pollExists(pollId)))
        throw 'Poll does not exist.';
    userId = requireId(userId, 'userId');
    if (!(await getUserById(userId)))
        throw 'User does not exist.';
    const poll = await getPollById(pollId);
    const vote = poll.votes.find((vote) => vote.user.equals(userId));
    return vote ? vote.vote : null;
};

const voteOnPoll = async (pollId, userId, vote) => {
    pollId = requireId(pollId, 'pollId');
    if (!(await pollExists(pollId)))
        throw 'Poll does not exist.';
    userId = requireId(userId, 'userId');
    if (!(await getUserById(userId)))
        throw 'User does not exist.';
    vote = requireInteger(vote, 'vote');
    const poll = await getPollById(pollId);
    if (vote < 0 || vote >= poll.choices.length)
        throw 'Invalid vote index.'
    const lastVote = await getVote(pollId, userId);
    if (lastVote !== null && lastVote === vote) return;
    const pollsCol = await polls();
    let res;
    if (lastVote !== null) {
        res = await pollsCol.updateOne(
            { _id: pollId, votes: { $elemMatch: { user: userId } } },
            { $set: { "votes.$.vote": vote } }
        );
    } else {
        res = await pollsCol.updateOne(
            { _id: pollId },
            { $push: { votes: {
                _id: ObjectId(),
                user: userId,
                vote: vote
            } } }
        );
    }
    if (!res.acknowledged || !res.modifiedCount)
        throw 'Failed to cast vote.';
}

module.exports = {
    getPollById,
    getPollInfoById,
    getPollResults,
    getVote,
    pollExists,
    requirePoll,
    voteOnPoll
};

const { polls, users } = require("../config/mongoCollections");
const { stringifyId, statusError, sync } = require("../helpers");
const { requireId } = require("../validation");
const { getUserById } = require("./users");

const pollExists = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id }, { project: { _id: 1 } });
    return poll !== null;
};

/**
 * Gaurantees poll existence. Also validates that current
 * user can view it.
 * @param {string} id Request parameter to check for id
 * @returns 
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

const getPollById = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id });
    if (!poll) return null;

    poll.votes = poll.votes.map(stringifyId);
    poll.reactions = poll.reactions.map(stringifyId);
    poll.comments = poll.comments.map(stringifyId);
    return stringifyId(poll);
};

const getPollSimplified = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id }, { project: { votes: 0, reactions: 0 } });
    if (!poll) return null;

    poll.votes = (await pollsCol.aggregate([
        { $match: { _id: id } },
        { $unwind: { path: '$votes' } },
        { $group: { _id: '$votes.vote', count: { $count: {} } } },
        { $sort: { _id: 1 } }
    ]).toArray()).map((vote) => vote.count);

    poll.reactions = (await pollsCol.aggregate([
        { $match: { _id: id } },
        { $unwind: { path: '$reactions' } },
        { $group: { _id: '$reactions.reaction', count: { $count: {} } } }
    ]).toArray()).map((reaction) => { return { reaction: reaction._id, count: reaction.count }; });

    poll.comments = poll.comments.map(stringifyId);

    return stringifyId(poll);
};

module.exports = {
    getPollById,
    getPollSimplified,
    pollExists,
    requirePoll
};

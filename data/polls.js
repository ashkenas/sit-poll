const { polls } = require("../config/mongoCollections");
const { stringifyId, statusError } = require("../helpers");
const { requireId } = require("../validation");

const pollExists = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id }, { project: { _id: 1 } });
    return poll !== null;
};

const requirePoll = (id) => (req, res, next) => {
    req.params[id] = requireId(req.params[id], id);
    pollExists(req.params[id]).then((exists) => {
        if(!exists)
            return next(statusError(404, 'Poll not found.'));
        next();
    }).catch(next);
};

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

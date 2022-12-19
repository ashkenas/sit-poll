const { ObjectId } = require("mongodb");
const { polls, users } = require("../config/mongoCollections");
const { stringifyId, statusError, sync } = require("../helpers");
const { requireId, requireInteger, requireOptions, requireDate, requireBoolean, requireString, validReactions } = require("../validation");
const { getUserById } = require("./users");

const createPoll = async (title, choices, authorID, public, close_date, rosterId) =>{
    title = requireString(title, 'title');
    if (title.length < 5)
        throw 'Title must be at least 5 characters long.';
    choices = requireOptions(choices, 'choices');
    if (choices.length < 2)
        throw 'Must provide at least 2 choices';
    authorID = requireId(authorID, 'authorID');
    const author = await getUserById(authorID);
    if (!author)
        throw 'Author does not exist.';
    public = requireBoolean(public, 'public');
    close_date = requireDate(close_date, 'close_date').getTime();
    if (close_date < Date.now())
        throw 'Poll must close after current date.';
    if (rosterId)
        rosterId = requireId(rosterId, 'rosterId');

    const id = ObjectId();
    const new_poll = {
        _id: id,
        title: title,
        choices: choices,
        author: authorID,
        public: public,
        posted_date: Date.now(),
        close_date: close_date,
        votes: [],
        reactions: [],
        comments: []
    };

    const pollCol = await polls();

    const pollInsertResult = await pollCol.insertOne(new_poll);
    if (!pollInsertResult.acknowledged)
        throw 'Poll creation failed.';

    if (rosterId) {
        const userCol = await users();
    
        const updateInfo = await userCol.updateOne(
            { rosters: { $elemMatch: { _id: rosterId } } },
            { $push: { 'rosters.$.polls': id } }
        );
        
        if (!updateInfo.acknowledged || !updateInfo.modifiedCount)
            throw 'Roster not found.';
    }

    return {
        success: true,
        pollId: id
    };
}

/**
 * Checks if a poll exists
 * @param {string|ObjectId} id The poll's ID
 * @returns {Promise<bool>} If the poll exists
 */
const pollExists = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne({ _id: id }, { projection: { _id: 1 } });
    return poll !== null;
};

const deletePoll = async (poll_id) => {
    poll_id = requireId(poll_id);
    const poll = await getPollById(poll_id);
    if (poll === null)
        throw 'Poll does not exist found.';

    if (!poll.public) {
        const userCol = await users();
        const removePollFromRosterInfo = await userCol.updateOne(
            { rosters: { $elemMatch: { polls: poll_id } } },
            { $pull: {"rosters.$.polls": poll_id } }
        );
        if(!removePollFromRosterInfo.acknowledged || !removePollFromRosterInfo.modifiedCount)
            throw 'Failed to remove poll from roster.';
    }

    const pollCol = await polls();
    const deletePollInfo = await pollCol.deleteOne({ _id: poll_id });
    if(!deletePollInfo.deletedCount)
        throw 'Failed to delete poll.';

    return { success: true };
};

/**
 * Middleware that gaurantees poll existence. Also
 * validates that the current user can view it.
 * @param {string} id Request parameter to check for id
 */
const requirePoll = (id) => sync(async (req, res, next) => {
    req.params[id] = requireId(req.params[id], id);
    const poll = await getPollById(req.params[id]);
    if (poll === null) // Make sure poll exists
        throw statusError(404, 'Poll not found.');

    req.session.self = poll.author.toString() === req.session.userId;

    if (req.session.admin) // Admins can always see
        return next();

    if (poll.public) // Poll is public
        return next();

    const usersCol = await users();
    if (req.session.manager) { // Check if the user manages this poll
        const manager = await usersCol.findOne({
            _id: ObjectId(req.session.userId),
            rosters: { $elemMatch: { polls: req.params[id] } }
        });
        if (manager) return next();
    }
    const manager = await usersCol.findOne({
        rosters: {
            $elemMatch: {
                students: (await getUserById(req.session.userId)).email,
                polls: req.params[id]
            }
        }
    });
    if (manager) // User has been assigned this poll
        return next();
    throw statusError(403, 'Permission denied.');
});

/**
 * Checks for the validity and existence of both the
 * given poll and user.
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 * @returns {Promise<ObjectId[]>} An array with both IDs
 */
const requirePollAndUser = async (pollId, userId) => {
    pollId = requireId(pollId, 'pollId');
    if (!(await pollExists(pollId)))
        throw 'Poll does not exist.';
    userId = requireId(userId, 'userId');
    if (!(await getUserById(userId)))
        throw 'User does not exist.';
    return [pollId, userId];
};

/**
 * Deletes a reaction from a poll made by a
 * specific user.
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 */
const deleteReaction = async (pollId, userId) => {
    [pollId, userId] = await requirePollAndUser(pollId, userId);

    const pollsCol = await polls();
    const res = await pollsCol.updateOne(
        { _id: pollId },
        { $pull: { reactions: { user: userId } } }
    );
    if (!res.acknowledged || !res.modifiedCount)
        throw 'Failed to delete reaction.';
};

/**
 * Returns all the polls a user can see.
 * This includes rosters they're in, polls
 * they made, and public polls.
 * @param {string|ObjectId} userId The user's ID
 * @returns {Promise<object[]>}
 */
const getAllPollsInfo = async (userId) => {
    userId = requireId(userId, 'userId');
    const user = await getUserById(userId);
    if (!user) throw 'User does not exist.';

    const usersCol = await users();
    const managers = await usersCol.find(
        {
            rosters: {
                $elemMatch: {
                    students: user.email
                }
            }
        },
        { 
            projection: { "rosters.$": 1 }
        }
    ).toArray();
    const personalPolls = managers.map(manager => manager.rosters[0].polls).flat();

    const pollsCol = await polls();
    const foundPolls = await pollsCol.find(
        {
            $or: [
                { author: userId },
                { public: true },
                { _id: { $in: personalPolls } }
            ]
        },
        { projection: { votes: 0, comments: 0, reactions: 0 } }
    ).toArray();

    return foundPolls.map(stringifyId);
};

/**
 * Gets the information for a poll. This does
 * not include votes, reactions, or comments.
 * @param {string|ObjectId} id The poll's ID
 * @returns {Promise<object>} The poll information
 */
const getPollInfoById = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne(
        { _id: id },
        { projection: { votes: 0, comments: 0, reactions: 0 } }
    );
    return poll ? stringifyId(poll) : null;
};


/**
 * Gets a poll.
 * @param {string|ObjectId} id The poll's ID
 * @returns {Promise<object>} The poll
 */
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

/**
 * Gets the info and results for a poll. Anonymizes
 * votes and reactions by aggregating them.
 * @param {string|ObjectId} id The poll's ID
 * @returns {Promise<object>} The poll info and results
 */
const getPollResults = async (id) => {
    id = requireId(id, 'id');
    const pollsCol = await polls();
    const poll = await pollsCol.findOne(
        { _id: id },
        { projection: { votes: 0, reactions: 0 } }
    );
    if (!poll) return null;

    let total = 0;
    const votes = (await pollsCol.aggregate([
        { $match: { _id: id } },
        { $project: { _id: 0, votes: 1 } },
        { $unwind: { path: '$votes' } },
        { $group: { _id: '$votes.vote', count: { $count: {} } } }
    ]).toArray()).reduce((prev, curr) => {
        total += curr.count;
        prev[poll.choices[curr._id]] = curr.count;
        return prev;
    }, {});

    poll.totalVotes = total;

    poll.votes = poll.choices.map((choice) => {
        return {
            choice: choice,
            votes: votes[choice] || 0,
            ratio: total ? (votes[choice] || 0) / total : 0
        };
    });

    const reactions = (await pollsCol.aggregate([
        { $match: { _id: id } },
        { $project: { _id: 0, reactions: 1 } },
        { $unwind: { path: '$reactions' } },
        { $group: { _id: '$reactions.reaction', count: { $count: {} } } }
    ]).toArray()).reduce((prev, curr) => (prev[curr._id] = curr.count, prev), {});

    poll.reactions = Object.keys(validReactions).map((reaction) => {
        return {
            reaction: reaction,
            count: reactions[reaction] || 0,
            label: validReactions[reaction]
        };
    });

    poll.comments = (await pollsCol.aggregate([
        { $match: { _id: id } },
        {
            $project: {
                comments: 1
            }
        },
        { $unwind: '$comments' },
        {
            $lookup: {
                from: 'users',
                localField: 'comments.user',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            display_name: 1
                        }
                    }
                ],
                as: 'comments.user'
            }
        },
        { $unwind: '$comments.user' },
        { $sort: { 'comments.date': -1 } }
    ]).toArray()).map((comment) => {
        comment = stringifyId(comment.comments)
        comment.user = stringifyId(comment.user);
        return comment;
    });

    return stringifyId(poll);
};

const getPollMetrics = async (id) => {
    id = requireId(id, 'id');
    if (!pollExists(id))
        throw 'Poll not found.';
    const poll = await getPollById(id);

    const pollsCol = await polls();

    const metricQuery = async (metric) => {
        const data = await pollsCol.aggregate([
            { $match: { _id: id } },
            { $unwind: '$votes' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'votes.user',
                    foreignField: '_id',
                    as: 'votes.user'
                }
            },
            { $unwind: '$votes.user' },
            { $addFields:
                { 
                    "votes.user.age": { 
                        $dateDiff: { startDate: "$votes.user.date_of_birth", endDate: "$$NOW", unit: "year" }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        vote: '$votes.vote',
                        metricVal: `$votes.user.${metric}`
                    },
                    count: { $count: {} }
                }
            }
        ]).toArray()
        
        const metricData = {};
        const totals = {};
        data.forEach(({ _id: { vote, metricVal }, count }) => {
            if (!metricData[metricVal]) {
                metricData[metricVal] = poll.choices.map((choice, i) => {
                    return {
                        choice: choice,
                        votes: 0,
                        id: `${metric}-${Object.keys(metricData).length}-${i}`
                    };
                });
                totals[metricVal] = 0;
            }

            metricData[metricVal][vote].votes = count;
            totals[metricVal] += count;
        });

        for (const metricVal in metricData) {
            metricData[metricVal].forEach((vote) =>
                vote.ratio = Math.floor((vote.votes / totals[metricVal]) * 1000) / 10
            );
        }

        const totalVotes = Object.values(totals).reduce((a, b) => a + b, 0);
        for (const metricVal in totals) {
            totals[metricVal] = {
                total: totals[metricVal],
                ratio: Math.floor((totals[metricVal] / totalVotes) * 1000) / 10
            };
        }

        return {
            totals: totals,
            values: metricData
        };
    };

    return [
        {
            name: 'gender',
            handle: 'Gender',
            ...(await metricQuery('gender'))
        },
        {
            name: 'major',
            handle: 'Major',
            ...(await metricQuery('major'))
        },
        {
            name: 'class_year',
            handle: 'Class Year',
            ...(await metricQuery('class_year'))
        },
        {
            name: 'age',
            handle: 'Age',
            ...(await metricQuery('age'))
        }
    ];
};

/**
 * Gets a user's reaction on a specific poll.
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 * @returns {Promise<string>} The reaction
 */
const getReaction = async (pollId, userId) => {
    [pollId, userId] = await requirePollAndUser(pollId, userId);

    const poll = await getPollById(pollId);
    const reaction = poll.reactions.find((reaction) => reaction.user.equals(userId));
    return reaction ? reaction.reaction : null;
};

/**
 * Gets a user's vote on a specific poll
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 * @returns {Promise<number>} The index of the user's choice
 */
const getVote = async (pollId, userId) => {
    [pollId, userId] = await requirePollAndUser(pollId, userId);

    const poll = await getPollById(pollId);
    const vote = poll.votes.find((vote) => vote.user.equals(userId));
    return vote ? vote.vote : null;
};

/**
 * Adds a reaction to a poll for a user.
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 * @param {string} reaction The reaction 
 * @returns {Promise<>} Nothing
 */
const reactOnPoll = async (pollId, userId, reaction) => {
    [pollId, userId] = await requirePollAndUser(pollId, userId);
    reaction = requireString(reaction, 'reaction').toLowerCase();
    if (!(Object.keys(validReactions).includes(reaction)))
        throw 'Invalid reaction.'

    const poll = await getPollById(pollId);
    const lastReaction = await getReaction(pollId, userId);
    if (lastReaction !== null && lastReaction === reaction) return;

    const pollsCol = await polls();
    let res;
    if (lastReaction !== null) {
        res = await pollsCol.updateOne(
            { _id: pollId, reactions: { $elemMatch: { user: userId } } },
            { $set: { "reactions.$.reaction": reaction } }
        );
    } else {
        res = await pollsCol.updateOne(
            { _id: pollId },
            {
                $push: {
                    reactions: {
                        _id: ObjectId(),
                        user: userId,
                        reaction: reaction
                    }
                }
            }
        );
    }
    if (!res.acknowledged || !res.modifiedCount)
        throw 'Failed to add reaction.';
};

/**
 * Adds a vote to a poll for a user.
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 * @param {number} vote The index of the choice to vote for 
 * @returns {Promise<>} Nothing
 */
const voteOnPoll = async (pollId, userId, vote) => {
    [pollId, userId] = await requirePollAndUser(pollId, userId);
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
            {
                $push: {
                    votes: {
                        _id: ObjectId(),
                        user: userId,
                        vote: vote
                    }
                }
            }
        );
    }
    if (!res.acknowledged || !res.modifiedCount)
        throw 'Failed to cast vote.';
};

/**
 * Adds a comment to a poll for a user.
 * @param {string|ObjectId} pollId The poll's ID
 * @param {string|ObjectId} userId The user's ID
 * @param {string} comment The comment text 
 * @returns {Promise<>} Nothing
 */
const addComment = async (pollId, userId, comment) => {
    [pollId, userId] = await requirePollAndUser(pollId, userId);
    comment = requireString(comment, 'comment');

    const newComment = {
        _id: ObjectId(),
        user: userId,
        comment: comment,
        date: new Date()
    };

    const pollsCol = await polls();
    const res = await pollsCol.updateOne(
        { _id: pollId },
        { $push: { comments: newComment } }
    );
    if (!res.acknowledged || !res.modifiedCount)
        throw 'Failed to add comment.';

    return newComment;
};

/**
 * Gets a comment by ID
 * @param {string|ObjectId} commentId The comments's ID
 * @returns {Promise<>} Nothing
 */
const getComment = async (commentId) => {
    commentId = requireId(commentId, 'commentId');

    const pollsCol = await polls();
    const poll = await pollsCol.findOne(
        { comments: { $elemMatch: { _id: commentId } } },
        { projection: { "comments.$": 1 } }
    );
    if (!poll) return null;
    return stringifyId(poll.comments[0]);
};

/**
 * Deletes a comment by ID
 * @param {string|ObjectId} commentId The comments's ID
 * @returns {Promise<>} Nothing
 */
const deleteComment = async (commentId) => {
    commentId = requireId(commentId, 'commentId');

    if (!getComment(commentId))
        throw 'Comment does not exist.';

    const pollsCol = await polls();
    const res = await pollsCol.updateOne(
        { comments: { $elemMatch: { _id: commentId } } },
        { $pull: { comments: { _id: commentId } } }
    );
    if (!res.acknowledged || !res.modifiedCount)
        throw 'Failed to delete comment.'
};

const updatePoll = async (poll_id, title, choices, close_date) =>{
    poll_id = requireId(poll_id, "poll_id");
    const poll = await getPollById(poll_id);
    if(!poll)
        throw 'Poll does not exist';
    title = requireString(title, 'title');
    if (title.length < 5)
        throw 'Title must be at least 5 characters long.';
    choices = requireOptions(choices, 'choices');
    if (choices.length < 2)
        throw 'Must provide at least 2 choices.';
    close_date = requireDate(close_date, 'close_date').getTime();
    if (close_date < Date.now())
        throw 'Poll must close in the future.';

    const pollCol = await polls();

    const updateInfo = await pollCol.updateOne(
        { _id: poll_id },
        {
            $set: {
                title: title,
                choices: choices,
                close_date: close_date
            }
        }
    );
    
    if (!updateInfo.acknowledged)
        throw "Failed to update poll.";

    return { success: true };
};

module.exports = {
    updatePoll,
    createPoll,
    deletePoll,
    addComment,
    deleteComment,
    deleteReaction,
    getAllPollsInfo,
    getComment,
    getPollById,
    getPollInfoById,
    getPollMetrics,
    getPollResults,
    getReaction,
    getVote,
    pollExists,
    reactOnPoll,
    requirePoll,
    voteOnPoll
};

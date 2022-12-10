const { users } = require("../config/mongoCollections");
const { stringifyId } = require("../helpers");
const { requireString, requireId } = require("../validation");

/**
 * Returns a user with the provided ID.
 * If the user doesn't exist, returns `null`.
 * @param {string|ObjectId} id The user's ID
 * @returns 
 */
const getUserById = async (id) => {
    id = requireId(id, 'id');
    const usersCol = await users();
    const user = await usersCol.findOne({ _id: id });
    return user ? stringifyId(user) : null;
};

/**
 * Returns a user with the provided email.
 * If the user doesn't exist, returns `null`.
 * @param {string} email The user's email
 * @returns 
 */
const getUserByEmail = async (email) => {
    email = requireString(email, 'email');
    const usersCol = await users();
    const user = await usersCol.findOne({ email: email });
    return user ? stringifyId(user) : null;
};

module.exports = {
    getUserByEmail,
    getUserById
};

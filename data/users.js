const { users } = require("../config/mongoCollections");
const { stringifyId } = require("../helpers");
const { requireString, requireId } = require("../validation");

const getUserById = async (id) => {
    id = requireId(id, 'id');
    const usersCol = await users();
    const user = await usersCol.findOne({ _id: id });
    return user ? stringifyId(user) : null;
};

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

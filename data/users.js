const { users } = require("../config/mongoCollections");
const { stringifyId, hashPassword } = require("../helpers");
const { requireString, requireId } = require("../validation");
const bcrypt = require('bcrypt')

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

const createUser = async function (username, password) { 
    if(arguments.length !== 2) throw "Too few or too many arguments"
    email = requireString(email, 'email');
    password = requireString(password, 'password')

    if(!email.match(/^[a-z]*[0-9]$/i) || email.length > 8)
        throw "Invalid Stevens email address"
    if(password.match(/\s/g))
        throw "Password must not contain spaces"
    if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g) || !password.match(/[\.,'";:\?!@#\$%\^&\*-\+]/g))
        throw "Password must be at least six characters and contain an uppercase letter, a digit, and a special character"  

    if(await getUserByEmail(email.toLowerCase()))
        throw "Username already taken"
    const hash = hashPassword(password)

    const newUser = {
        email: email.toLowerCase(),
        password: hash
    }

    const usersCol = await users();
    const insertInfo = await usersCol.insertOne(newUser);
    if (!insertInfo.acknowledged || !insertInfo.insertedId)
        throw 'Could not add user';

    return {insertedUser: true}
};

const validateUser = async function (email, password) { 
    if(arguments.length !== 2) throw "Too few or too many arguments"
    email = requireString(email, 'email');
    password = requireString(password, 'password')

    const user = await getUserByEmail(email.toLowerCase());
    if(user === null) throw "Either the username or password is invalid"

    if(!await bcrypt.compare(password, user.pass_hash)) throw "Either the username or password is invalid"
    return {authenticatedUser: true}
};

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    validateUser
};

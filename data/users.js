const { users } = require("../config/mongoCollections");
const { stringifyId, hashPassword } = require("../helpers");
const { requireString, requireId, requireDate, validGenders, validSchools, validMajors, requireInteger } = require("../validation");
const bcrypt = require('bcryptjs')

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

const createUser = async function (email, password, display_name, major, school, gender, class_year, date_of_birth) {
    email = requireString(email, 'email').toLowerCase();
    password = requireString(password, 'password');
    display_name = requireString(display_name, 'display_name');
    major = requireString(major, 'major');
    school = requireString(school, 'school');
    gender = requireString(gender, 'gender');
    class_year = requireInteger(class_year, 'class_year');
    date_of_birth = requireDate(date_of_birth, 'date_of_birth');

    if(!email.match(/^[a-z]{3,}[0-9]*$/))
        throw "Invalid Stevens email address.";
    if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g) || !password.match(/[!-\/:-@\[-`]/g))
        throw "Password must be at least six characters and contain an uppercase letter, a digit, and a special character.";
    if(display_name.length < 2)
        throw 'Display name must be at least 2 characters long.';
    if(display_name.match(/[^a-z.'\-]/i))
        throw 'Display name can only contain letters, periods, and apostrophes.';
    if(!validGenders.includes(gender))
        throw 'Invalid gender.';
    if(!validSchools.includes(school))
        throw 'Invalid school.';
    if(!validMajors.includes(major))
        throw 'Invalid major.';
    const thisYear = (new Date()).getFullYear();
    if(class_year < thisYear || class_year >= thisYear + 8)
        throw 'Invalid class year';
    if(date_of_birth > new Date())
        throw 'Cannot be born in the future.';
    if((new Date() - date_of_birth) < 1000*60*60*24*365*17)
        throw 'Must be at least 17 years old.'

    if(await getUserByEmail(email))
        throw "Username already taken.";
    const hash = await hashPassword(password);

    const newUser = {
        email: `${email.toLowerCase()}@stevens.edu`,
        pass_hash: hash,
        display_name: display_name,
        major: major,
        school: school,
        gender: gender,
        class_year: class_year,
        date_of_birth: date_of_birth,
        is_admin: false,
        is_manager: false,
        rosters: []
    };

    const usersCol = await users();
    const insertInfo = await usersCol.insertOne(newUser);
    if (!insertInfo.acknowledged || !insertInfo.insertedId)
        throw 'Failed to add user.';

    return { insertedUser: insertInfo.insertedId };
};

const validateUser = async function (email, password) {
    email = requireString(email, 'email');
    password = requireString(password, 'password');

    const user = await getUserByEmail(email.toLowerCase());
    if(user === null)
        throw "Either the username or password is invalid"

    if(!await bcrypt.compare(password, user.pass_hash))
        throw "Either the username or password is invalid";
    return { authenticatedUser: true };
};

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    validateUser
};

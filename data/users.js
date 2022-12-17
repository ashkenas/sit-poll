const { users } = require("../config/mongoCollections");
const { stringifyId, hashPassword, statusError } = require("../helpers");
const { requireString, requireDate, requireId, requireInteger } = require("../validation");
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

const createUser = async function (email, password, display_name, major, school, gender, date_of_birth, class_year) { 
    if(arguments.length !== 8) throw statusError(500, "Internal server error.")
    email = requireString(email, 'email');
    password = requireString(password, 'password')
    display_name = requireString(display_name, 'display_name')
    major = requireString(major, 'major')
    school = requireString(school, 'school')
    gender = requireString(gender, 'gender')
    date_of_birth = requireDate(date_of_birth, 'date_of_birth')
    class_year = requireInteger(class_year, 'class_year')

    if(!email.match(/^[a-z]+\d*@stevens\.edu$/i) || email.substring(0, email.indexOf('@')).length > 8)
           throw statusError(400, "Invalid Stevens email address")
    if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g)
    || !password.match(/[\.,'";:\?!@#\$%\^&\*-\+]/g) || password.match(/\s/g))
        throw statusError(400, "Password must be at least six characters and contain no spaces, an uppercase letter, a digit, and a special character")    
    
    const user = await getUserByEmail(email.toLowerCase());
    if(user)
        throw statusError(400, "User already exists") 

    if(!/^[a-zA-Z\-]{3,} [a-zA-Z\-,\.']{3,}$/.test(display_name) || /[\-']{2,}/g.test(display_name)) 
        throw statusError(400, "Invalid name")

    const majors = ["biomedical engineering", "chemical engineering", "civil engineering", "computer engineering", "electrical engineering",
    "engineering - naval engineering concentration", "engineering - optical engineering concentration", "mechanical engineering", "biology",
    "chemistry", "chemical biology", "pure and applied mathematics", "physics", "computer science", "cybersecurity", "accounting and analytics",
    "business and technology", "economics", "finance", "information systems", "management", "marketing innovation and analytics", 
    "quantitative finance", "engineering management", "industrial and systems engineering", "software engineering", "music and technology", 
    "visual arts and technology", "science, technology, and society", "quantitative social science", "science communication", "literature",
    "philosophy", "engineering undecided", "humanities undecided"]
    if(majors.indexOf(major.toLowerCase()) === -1)
    throw statusError(400, "Invalid major. Give the full name if you haven't done so.")

    const schools = ["Schaefer School of Engineering and Science", "School of Business", "School of Systems and Enterprises", "College of Arts and Letters"]
    if(schools.indexOf(school) === -1)
        throw statusError(400, "Inavlid school")

    const genders = ['M', 'F', 'T', 'NB', 'GN', 'O', 'P']
    if(genders.indexOf(gender) === -1)
        throw statusError(400, "Invalid gender")

    if(date_of_birth.getTime() > (new Date).getTime())
        throw statusError(400, "Invalid date of birth")

    const years = [2022, 2023, 2024, 2025, 2026]
    if(years.indexOf(class_year) === -1)
        throw statusError(400, "Invalid graduation year")

    const hash = await hashPassword(password)

    const newUser = {
        email: email.toLowerCase(),
        pass_hash: hash,
        display_name: display_name,
        major: major,
        school: school,
        gender: gender,
        date_of_birth: date_of_birth,
        class_year: parseInt(class_year),
        is_admin: false,
        is_manager: false,
        rosters: []
    }

    const usersCol = await users();
    const insertInfo = await usersCol.insertOne(newUser);
    if (!insertInfo.acknowledged || !insertInfo.insertedId)
        throw statusError(500, 'Could not add user');

    return {insertedUser: true}
};

const validateUser = async function (email, password) { 
    if(arguments.length !== 2) throw statusError(500, "Interal server error")
    email = requireString(email, 'email');
    password = requireString(password, 'password')

    const user = await getUserByEmail(email.toLowerCase());
    if(user === null) throw statusError(400, "Either the username or password is invalid")

    if(!await bcrypt.compare(password, user.pass_hash)) throw statusError(400, "Either the username or password is invalid")
    return {authenticatedUser: true}
};

module.exports = {
    getUserByEmail,
    getUserById,
    createUser,
    validateUser
};

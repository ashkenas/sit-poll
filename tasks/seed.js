const { ObjectId } = require("mongodb");
const { hashPassword } = require("../helpers");
const { purge } = require("../routes/polls");
const { dbConnection, closeConnection } = require("../config/mongoConnection");
const collections = require("../config/mongoCollections");

/*
 * Database seeding for testing.
 */
const users = [];

const allMajors = {
    "Computer Science": "Schaefer School of Engineering",
    "Computer Engineering": "Schaefer School of Engineering",
    "Chemical Engineering": "Schaefer School of Engineering",
    "Mechanical Engineering": "Schaefer School of Engineering",
    "Accounting": "School of Business",
    "Finance": "School of Business",
    "Economics": "School of Business",
    "Engineering Management": "School of Systems",
    "Software Engineering": "School of Systems",
};

const csMajor = { "Computer Science": "Schaffer School of Engineering" };

const engineeringMajors = {
    "Computer Engineering": "Schaefer School of Engineering",
    "Chemical Engineering": "Schaefer School of Engineering",
    "Mechanical Engineering": "Schaefer School of Engineering"
};

const randomMajor = (majors) => {
    const keys = Object.keys(majors);
    const major = keys[Math.floor(Math.random() * keys.length)];
    return [major, majors[major]];
};

const User = async (email, password, name, major, school, gender, dob, class_year, admin, manager) => {
    return {
        _id: ObjectId(),
        email: email,
        pass_hash: await hashPassword(password),
        display_name: name,
        major: major,
        school: school,
        gender: gender,
        date_of_birth: dob,
        class_year: class_year,
        is_admin: admin,
        is_manager: manager,
        rosters: []
    };
};

const Roster = (label, students, assistants) => {
    return {
        _id: ObjectId(),
        label: label,
        students: students,
        assistants: assistants,
        polls: []
    };
};

const Poll = (title, choices, author, public, posted, close) => {
    return {
        _id: ObjectId(),
        title: title,
        choices: choices,
        author: author,
        public: public,
        posted_date: posted,
        close_date: close,
        votes: [],
        reactions: [],
        comments: []
    };
};

const Vote = (user, vote) => {
    return {
        _id: ObjectId(),
        user: user,
        vote: vote
    };
};

const Reaction = (user, reaction) => {
    return {
        _id: ObjectId(),
        user: user,
        reaction: reaction
    };
};

const Comment = (user, comment, date) => {
    return {
        _id: ObjectId(),
        user: user,
        comment: comment,
        date: date
    };
};

const generateRoster = async (name, size, majors, s) => {
    const students = [];
    for (let i = 0; i < size; i++) {
        const [major, school] = randomMajor(majors);
        const dob = new Date(Math.floor(Math.random() * 4) + 2001, Math.floor(Math.random() * 12), Math.floor(Math.random() * 27));
        const student = await User(`student${s+i}@stevens.edu`, `password${s+i}`, `Student ${s + i}`,
            major, school, Math.random() > .5 ? 'F' : 'M', dob.getTime(), dob.getFullYear() + 22, false, false);

        users.push(student);
        students.push(student.email);
    }

    return Roster(name, students, []);
};

const main = async () => {
    // Make an admin
    const admin = await User('admin@stevens.edu', 'pass1234', 'Admin', '', '', '', 0, 0, true, false);
    // Generate some rosters
    const rAll1 = await generateRoster('All1', 100, allMajors, 1);
    const rAll2 = await generateRoster('All2', 80, allMajors, 101);
    const rCS1 = await generateRoster('CS1', 80, csMajor, 181);
    rCS1.students.push(...rAll1.students.slice(0, 4));
    const rCS2 = await generateRoster('CS2', 100, csMajor, 261);
    rCS2.students.push(...rAll1.students.slice(2, 6));
    rCS2.assistants.push(rCS1.students[0]);
    const rEng1 = await generateRoster('Eng1', 100, engineeringMajors, 361);
    rEng1.students.push(...rAll1.students.slice(6, 11));
    const rEng2 = await generateRoster('Eng2', 40, engineeringMajors, 461);
    rEng2.students.push(...rAll1.students.slice(9, 15));
    const rEng3 = await generateRoster('Eng3', 50, engineeringMajors, 501);
    rEng3.students.push(...rAll1.students.slice(13, 17));
    // Make some professors
    const pAll = await User('bookworm@stevens.edu', 'i<3books', 'Dr. Book-Worm', '',
        'College of Arts and Letters', 'M', new Date(1976, 5, 12), 0, false, true);
    const pCS = await User('beepboop@stevens.edu', 'i<3webdev', 'Dr. Beep-Boop', '',
        'Schaefer School of Engineering', 'F', new Date(1973, 2, 20), 0, false, true);
    const pEng = await User('handyman@stevens.edu', 'i<3physics', 'Dr. Handyman', '',
        'Schaefer School of Engineering', 'M', new Date(1978, 11, 4), 0, false, true);
    // Give them some students
    pAll.rosters = [rAll1, rAll2];
    pCS.rosters = [rCS1, rCS2];
    pEng.rosters = [rEng1, rEng2, rEng3];
    // Make some polls
    const pollCS = Poll("Should we do more beep boop?", ['Definitely', 'Yes', 'Maybe', "I'd rather not", 'I will drop out'],
        pCS._id, false, Date.now() - (Math.random() * 1000*60*60*24*3), Date.now() + ((1 + (Math.random() * 2)) * 1000*60*60*24));
    rCS2.polls.push(pollCS._id);
    const pollAll = Poll("Stevens?", ['Quack', 'Castle Point Hill', 'More debt???'],
        admin._id, true, Date.now() - (Math.random() * 1000*60*60*24*3), Date.now() + ((1 + (Math.random() * 2)) * 1000*60*60*24));
    // Database things
    const db = await dbConnection();
    await db.dropDatabase();
    const usersCol = await collections.users();
    const pollsCol = await collections.polls();
    await usersCol.insertMany([...users, admin, pAll, pCS, pEng]);
    await pollsCol.insertMany([pollCS, pollAll]);
    closeConnection();
};

main();

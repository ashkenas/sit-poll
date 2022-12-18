/*
 * Database seeding for testing.
 */
const { ObjectId } = require("mongodb");
const { hashPassword } = require("../helpers");
const { dbConnection, closeConnection } = require("../config/mongoConnection");
const collections = require("../config/mongoCollections");

const users = [], polls = [];

const User = async (email, password, name, major, school, gender, dob, class_year, admin, manager) => {
    const user = {
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
    users.push(user);
    return user;
};

const dataToUsers = async (dataGroup) => {
    for (let i = 0; i < dataGroup.length; i++) {
        const user = dataGroup[i];
        dataGroup[i] = await User(
            user.email,
            user.email.split('@')[0] + 'A1!',
            `${user.first_name} ${user.last_name}`,
            user.major,
            user.school,
            user.gender,
            new Date(+user.date_of_birth),
            user.class_year,
            false,
            false
        );
    }
    return dataGroup;
}

const Roster = (label, students, assistants) => {
    return {
        _id: ObjectId(),
        label: label,
        students: students.map(e => e.email),
        assistants: assistants,
        polls: []
    };
};

const Poll = (title, choices, author, public, posted, close) => {
    const poll = {
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
    polls.push(poll);
    return poll;
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

const populatePoll = (poll, roster, admin = false) => {
    if (!admin)
        roster.polls.push(poll._id);
    roster.students.forEach(student => {
        const user = users.find(user => user.email === student);
        if (Math.random() < .8) {
            poll.votes.push(Vote(user._id, Math.floor(Math.random() * poll.choices.length)));
            if (Math.random() < .9)
                poll.reactions.push(Reaction(user._id, Math.random() < .8 ? 'like' : 'dislike'));
            if (Math.random() < .15)
                poll.comments.push(Comment(user._id, `My favorite beep boop is beep boop #${Math.floor(Math.random()*10000)}`,
                    Date.now() - Math.floor(Math.random() * 1000*60*60*24*2)));
        }
    });
};

const main = async () => {
    const start = Date.now();
    process.stdout.write('Creating users... ');
    // Make an admin
    const admin = await User('admin@stevens.edu', 'Admin1!', 'Admin', '', '', '', 0, 0, true, false);
    // Load students
    const cs2026 = await dataToUsers(require('../seed_data/cs2026.json'));
    const cs2025 = await dataToUsers(require('../seed_data/cs2025.json'));
    const cs2024 = await dataToUsers(require('../seed_data/cs2024.json'));
    const cs2023 = await dataToUsers(require('../seed_data/cs2023.json'));
    const eng2026 = await dataToUsers(require('../seed_data/eng2026.json'));
    const eng2025 = await dataToUsers(require('../seed_data/eng2025.json'));
    const eng2024 = await dataToUsers(require('../seed_data/eng2024.json'));
    const eng2023 = await dataToUsers(require('../seed_data/eng2023.json'));
    const business = await dataToUsers(require('../seed_data/business.json'));
    process.stdout.write('done!\n');

    // Generate some rosters
    process.stdout.write('Creating rosters... ');
    const cs115a = Roster('CS 115-A', cs2026.slice(0, 100), []);
    const cs115b = Roster('CS 115-B', cs2026.slice(100, 200), []);
    const cs115c = Roster('CS 115-C', cs2026.slice(200, 300), []);
    const cs284a = Roster('CS 284-A', cs2025.slice(0, 100), []);
    const cs284b = Roster('CS 284-B', cs2025.slice(100, 200), []);
    const cs284c = Roster('CS 284-C', cs2025.slice(200, 300), []);
    const cs385a = Roster('CS 385-A', cs2024.slice(0, 100), []);
    const cs385b = Roster('CS 385-B', cs2024.slice(100, 200), []);
    const cs385c = Roster('CS 385-C', cs2024.slice(200, 300), []);
    const cs546a = Roster('CS 546-A', cs2023.slice(0, 100), []);
    const cs546b = Roster('CS 546-B', cs2023.slice(100, 200), []);
    const cs546c = Roster('CS 546-C', cs2023.slice(200, 300), []);
    const cal103 = Roster('CAL 103', [...cs2026, ...eng2026]);
    const obi101 = Roster('Obituaries 101', [...cs2025, ...eng2025]);
    const napping = Roster('Napping', [...cs2023, ...eng2023, ...business]);
    const creative = Roster('Creative Writing', [...cs2026, ...cs2025, ...cs2024, ...cs2023, ...eng2026, ...eng2025, ...eng2024, ...eng2023, ...business]);
    const accting = Roster('Accounting for Babies', [...business]);
    const csClub = Roster('CS Club', [...(cs2023.slice(1)), ...cs2024, ...cs2025, ...cs2026]);
    process.stdout.write('done!\n');

    // Make some professors
    process.stdout.write('Creating professors... ');
    const p115 = await User('beepboop@stevens.edu', 'Prof1!', 'Prof. Beepboop', 'N/A',
        'Schaefer School of Engineering and Science', 'Male', new Date(1976, 5, 12), 0, false, true);
    p115.rosters = [cs115a, cs115b, cs115c];
    const p284 = await User('treeman@stevens.edu', 'Prof1!', 'Prof. Treeman', 'N/A',
        'Schaefer School of Engineering and Science', 'Male', new Date(1974, 6, 12), 0, false, true);
    p284.rosters = [cs284a, cs284b, cs284c];
    const p385 = await User('happiness@stevens.edu', 'Prof1!', 'Prof. Happiness', 'N/A',
        'Schaefer School of Engineering and Science', 'Male', new Date(1978, 6, 18), 0, false, true);
    p385.rosters = [cs385a, cs385b, cs385c];
    const p546 = await User('bigmound@stevens.edu', 'Prof1!', 'Prof. BigMound', 'N/A',
        'Schaefer School of Engineering and Science', 'Male', new Date(1980, 3, 17), 0, false, true);
    p546.rosters = [cs546a, cs546b, cs546c];
    const p103 = await User('right@stevens.edu', 'Prof1!', 'Prof. Right', 'N/A',
        'College of Arts and Letters', 'Male', new Date(1965, 2, 11), 0, false, true);
    p103.rosters = [cal103];
    const p101 = await User('morticia@stevens.edu', 'Prof1!', 'Prof. Morticia', 'N/A',
        'College of Arts and Letters', 'Female', new Date(1964, 1, 4), 0, false, true);
    p101.rosters = [obi101];
    const pNap = await User('sleepy@stevens.edu', 'Prof1!', 'Prof. Sleepy', 'N/A',
        'School of Business', 'Female', new Date(1990, 7, 3), 0, false, true);
    pNap.rosters = [napping];
    const pWri = await User('essay@stevens.edu', 'Prof1!', 'Prof. SA', 'N/A',
        'College of Arts and Letters', 'Female', new Date(1985, 3, 9), 0, false, true);
    pWri.rosters = [creative];
    const pAct = await User('quickmaf@stevens.edu', 'Prof1!', 'Prof. QuickMaf', 'N/A',
        'School of Business', 'Female', new Date(1981, 8, 3), 0, false, true);
    pAct.rosters = [accting];
    process.stdout.write('done!\n');

    // Assign roster to club president
    cs2023[0].rosters = [csClub];
    cs2023[0].is_manager = true;

    // Make some polls
    process.stdout.write('Creating polls... ');
    const plAdmin = Poll('Do you like rubber ducks?', ['Yes','Obviously','No, I hate this school.','DUCKSDUCKSDUCKS!!!'],
        admin._id, true, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(plAdmin, creative, true);
    const pl115a = Poll('Did you fill out your course evaluation?', ['Yes','Not yet, but I will later','I\'ll finish it now','I refuse'],
        p115._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl115a, cs115a);
    const pl115b = Poll('Did you fill out your course evaluation?', ['Yes','Not yet, but I will later','I\'ll finish it now','I refuse'],
        p115._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl115b, cs115b);
    const pl115c = Poll('Did you fill out your course evaluation?', ['Yes','Not yet, but I will later','I\'ll finish it now','I refuse'],
        p115._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl115c, cs115c);
    const pl284a = Poll('Which Data Structure is your favorite?', ['linked list','binary tree','heap','I hate all data structures'],
        p284._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl284a, cs284a);
    const pl284b = Poll('Which Data Structure is your favorite?', ['linked list','binary tree','heap','I hate all data structures'],
        p284._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl284b, cs284b);
    const pl284c = Poll('Which Data Structure is your favorite?', ['linked list','binary tree','heap','I hate all data structures'],
        p284._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl284c, cs284c);
    const pl385a = Poll('Which sorting algorithm is your favorite?', ['Bubble sort','Selection sort','Insertion sort','Quicksort','Mergesort'],
        p385._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl385a, cs385a);
    const pl385a2 = Poll('How are you feeling?', ['Happiness','No Happiness','Sadness','Madness'],
        p385._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl385a2, cs385a);
    const pl385b = Poll('How are you feeling?', ['Happiness','No Happiness','Sadness','Madness'],
        p385._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl385b, cs385b);
    const pl385c = Poll('How are you feeling?', ['Happiness','No Happiness','Sadness','Madness'],
        p385._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl385c, cs385c);
    const pl546a = Poll('When did you finish your final project?', ['A few weeks ago','This week','Today','It\'s not done yet'],
        p546._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl546a, cs546a);
    const pl546b = Poll('Are you done with your final project?', ['Of course','Still working on it','There\'s a final project?'],
        p546._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl546b, cs546b);
    const pl546c = Poll('When is the final project due?', ['December 18','December 25','There\'s a final project?'],
        p546._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl546c, cs546c);
    const pl103 = Poll('How many books have you read this semester?', ['1','2','3','None, not even the required ones'],
        p103._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl103, cal103);
    const pl101 = Poll('Are you dead yet?', ['Yes','No','Just on the inside'],
        p101._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(pl101, obi101);
    const plNap = Poll('Do you regularly sleep during this class?', ['Yes (congrats)','No (Why not?)'],
        pNap._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(plNap, napping);
    const plWri = Poll('Are you happy today?', ['Yes, like the warm sun on a bright April day','No, I am a dark cloud on the verge of raining'],
        pWri._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(plWri, creative);
    const plAcc = Poll('What is 1+1?', ['1','2','3','42'],
        pAct._id, false, Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(plAcc, accting);
    const plClosed = Poll('How\'s the weather?', ['Fine', 'Less fine'], admin._id, true, Date.now() - 1000*60*60*24*2, Date.now());
    populatePoll(plClosed, creative, true);
    const plCSClub = Poll('Am I a good club president?', ['Yes', 'Absolutely', 'I love you'], cs2023[0]._id, false,
        Date.now() - (1000*60*60*24*2), Date.now() + Math.floor((1 + (Math.random() * 2)) * 1000*60*60*24));
    populatePoll(plCSClub, csClub);
    process.stdout.write('done!\n');
    
    // Database things
    process.stdout.write('Adding all data to MongoDB... ');
    const db = await dbConnection();
    await db.dropDatabase();
    const usersCol = await collections.users();
    const pollsCol = await collections.polls();
    await usersCol.insertMany(users);
    await pollsCol.insertMany(polls);
    closeConnection();
    process.stdout.write('done!\n');
    console.log(`Completed seeding in ${(Date.now() - start) / 1000}s`);
};

main();

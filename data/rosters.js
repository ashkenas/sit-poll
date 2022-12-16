const e = require("express");
const { ObjectId } = require("mongodb");
const { users } = require("../config/mongoCollections");
const { stringifyId, statusError } = require("../helpers");
const { requireString, requireId, requireEmail, requireEmails } = require("../validation");
const { getUserByEmail } = require("./users");

// return rosters array that is associated with a given user
const getRostersByUserId = async (userId) => {
  userId = requireId(userId, 'id');
  const usersCol = await users();
  const user = await usersCol.findOne({ _id: userId });
  return user.rosters/* (user.is_manager || user.is_admin) ? user.rosters : null */;
};

// return roster associated with a given roster id
const getRosterById = async (rosterId) => {
  rosterId = requireId(rosterId, 'roster id');
  const usersCol = await users();
  const user = await usersCol.findOne(
    {'rosters._id': rosterId},
    {projection: {"rosters.$": true}}
  );

  if(user) {
    return user.rosters[0];
  } else {
    throw statusError(404, `Roster with ID ${rosterId} not found`);
  }
  
};

// return user info for which new object is created
const createRoster = async (userId, label, students, assistants) => {
  userId = requireId(userId, 'id');
  label = requireString(label, 'roster label');
  students = requireEmails(students, 'students');
  if(assistants.length===0) {
    assistants = [];
  } else {
    assistants = requireEmails(assistants, 'assistants');
  }

  // todo: check for existing label (don't want two rosters of the same name)

  const usersCol = await users();
  const failedToAdd = [];
  const studentsToAdd = [];
  //todo: check for duplicate emails in students array
  students.forEach(async(studentEmail) => {
    studentEmail = requireEmail(studentEmail);
    //const student = await usersCol.findOne({email: studentEmail});
    if(studentsToAdd.includes(studentEmail)) failedToAdd.push(studentEmail);
    else studentsToAdd.push(studentEmail);
  });

  const assistantsToAdd = [];
  //todo: check for valid assistants array
  assistants.forEach(async(assistantEmail) => {
    //const assistant = await usersCol.findOne({email: assistantEmail});
    if(assistantsToAdd.includes(assistantEmail) || studentsToAdd.includes(assistantEmail)) failedToAdd.push(assistantEmail);
    else assistantsToAdd.push(assistantEmail);
  });
  
  const user = await usersCol.findOne({_id: userId});

  const newRoster = {
    _id: ObjectId(),
    label: label,
    students: studentsToAdd,
    assistants: assistantsToAdd,
    polls: []
  }

  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$addToSet: {rosters: newRoster}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, `Error: could not update user with roster successfully`);
  }

  if(failedToAdd.length > 0) {
    throw statusError(404, `Could not add duplicate emails to roster: ` + failedToAdd.toString());
  }

  return user;
};

// return object indicating roster was removed successfully, else throw error
const deleteRoster = async (rosterId) => {
  rosterId = requireId(rosterId, 'roster id');

  const usersCol = await users();

  // returns the user which contains the given roster
  const userWithRoster = await usersCol.findOne(
    {"rosters._id": rosterId}
  );

  const updatedInfo = await usersCol.updateOne(
    {_id: userWithRoster._id},
    {$pull: {rosters: {"_id": rosterId}}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, `Error: could not remove roster successfully`);
  }

  return {deleted: 'true'};
};

//todo: update to make roster how we want it; would then have to also update removePersonFromRoster
const addPersonToRoster = async (userId, rosterId, emailArray, category) => {
  userId = requireId(userId, 'user id');
  rosterId = requireId(rosterId, 'roster id');
  emailArray = requireEmails(emailArray, 'email');
  category = requireString(category, 'category').trim().toLowerCase();

  if (category !== 'students' && category !== 'assistants')
  // todo: double check what error should be thrown here
    throw statusError(400, `${category || "category"} is undefined`);

  const usersCol = await users();
  console.log('adding people');
  // returns the user which contains the given roster
  const userWithRoster = await usersCol.findOne(
    {"rosters._id": rosterId}
  );

  if(!userWithRoster._id.equals(userId)) {
    throw statusError(401, `Roster cannot be edited by current user`);
  }

  const roster = await getRosterById(rosterId);
  console.log(roster.students);
  let unadded = [];

  emailArray.forEach(async (email) => {
    
    // todo: if email already exists in roster, do not allow user to add again (or simply do not re-add)
    // todo: should it simply be skipped? -- need to remove student and add back if changing between student/assistant
    if ((roster.students).includes(email) || (roster.assistants).includes(email)) {
      //throw statusError(400, `${email || "email"} already exists in roster. Any emails before this email have been added.`);
      unadded.push(email);
      return;
    }

    const updatedInfo = await usersCol.updateOne(
      //{_id: userWithRoster._id},
      {_id: userId, 'rosters._id': rosterId},
      {$addToSet: {["rosters.$." + category]: email}}
    );

    if (updatedInfo.modifiedCount === 0) {
      throw statusError(500, `Error: could not add ${email || "student"} to roster successfully. Any emails before this email have been added.`);
    }
  });

  if (unadded.length > 0) {
    // todo: check error status, figure out new line for each email; maybe just alert user rather than error?
    throw statusError(400, `Unable to add the following email(s) because they already exist in the roster:\n` + unadded.join('\r\n'));
  }
  
  return {addedToRoster: 'true'};
};

const removePersonFromRoster = async (userId, rosterId, studentEmail, category) => {
  rosterId = requireId(rosterId, 'roster id');
  userId = requireId(userId, 'user id');
  studentEmail = requireEmail(studentEmail, 'email');
  category = requireString(category, 'category').trim();

  const usersCol = await users();

  // returns the user which contains the given roster
  const userWithRoster = await usersCol.findOne(
    {"rosters._id": rosterId}
  );

  if(!userWithRoster._id.equals(userId)) {
    throw statusError(401, `Roster cannot be edited by current user`);
  }

  const student = await getUserByEmail(studentEmail);
  if(student === null) {
    throw statusError(404, `${studentEmail} does not exist`);
  }

  const roster = await getRosterById(rosterId);
  if(!roster.students.includes(studentEmail) && !roster.assistants.includes(studentEmail)) {
    throw statusError(404, `${studentEmail} is not in this roster`);
  }

  const updatedInfo = await usersCol.updateOne(
    {_id: userId, 'rosters._id': rosterId},
    {$pull: {['rosters.$.' + category]: studentEmail}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, `Error: could not remove ${studentEmail || "student"} from roster successfully`);
  }

  return {addedToRoster: 'true'};
};

// return roster that has been updated with label
const updateRosterLabel = async (userId, rosterId, label) => {
  userId = requireId(userId, 'user id');
  rosterId = requireId(rosterId, 'roster id');
  label = requireString(label, 'roster label');
  const usersCol = await users();
  
  // returns the user which contains the given roster
  const userWithRoster = await usersCol.findOne(
    {"rosters._id": rosterId}
  );

  if(!userWithRoster._id.equals(userId)) {
    throw statusError(401, `Roster cannot be edited by current user`);
  }

  const updatedInfo = await usersCol.updateOne(
    //{_id: userWithRoster._id},
    {_id: userId, 'rosters._id': rosterId},
    {$set: {"rosters.$.label": label}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, 'Error: could not change roster label successfully');
  }
  
  const user = await usersCol.findOne(
    {'rosters._id': rosterId},
    {projection: {"rosters.$": true}}
  );

  if(user) {
    return user.rosters[0];
  } else {
    throw statusError(404, `Roster with ID ${rosterId} not found`);
  }
}

module.exports = {
    getRostersByUserId,
    getRosterById,
    createRoster,
    deleteRoster,
    addPersonToRoster,
    removePersonFromRoster,
    updateRosterLabel
};

const { ObjectId } = require("mongodb");
const { users } = require("../config/mongoCollections");
const { stringifyId } = require("../helpers");
const { requireString, requireId, requireEmail } = require("../validation");

// return rosters array that is associated with a given user
const getRostersByUserId = async (userId) => {
  userId = requireId(userId, 'id');
  const usersCol = await users();
  const user = await usersCol.findOne({ _id: userId });
  return (user.is_manager || user.is_admin) ? user.rosters : null;
};

// return user info for which new object is created
const createRoster = async (userId, label) => {
  userId = requireId(userId, 'id');
  label = requireString(label, 'roster label').trim();

  const usersCol = await users();
  const user = await usersCol.findOne({_id: userId});

  const newRoster = {
    _id: ObjectId(),
    label: label,
    students: [],
    assistants: [],
    polls: []
  }

  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$addToSet: {rosters: newRoster}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw 'Error: could not update user with roster';
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
    throw 'Error: could not remove roster successfully';
  }

  return {deleted: 'true'};
};

//todo: update to make roster how we want it; would then have to also update removePersonFromRoster
const addPersonToRoster = async (rosterId, email, category) => {
  rosterId = requireId(rosterId, 'roster id');
  email = requireEmail(email, 'email').trim().toLowerCase();
  category = requireString(category, 'category').trim();

  const usersCol = await users();

  // returns the user which contains the given roster
  const userWithRoster = await usersCol.findOne(
    {"rosters._id": rosterId}
  );
  
  // returns the user with the given email
  const userWithEmail = await usersCol.findOne(
    {email: email}
  );

  const student = {
    _id: userWithEmail._id,
    display_name: userWithEmail.display_name,
    email: userWithEmail.email
  }

  const updatedInfo = await usersCol.updateOne(
    {_id: userWithRoster._id},
    {$addToSet: {['rosters.' + category]: student}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw 'Error: could not remove roster successfully';
  }

  return {addedToRoster: 'true'};
};

const removePersonFromRoster = async (rosterId, userId, category) => {
  rosterId = requireId(rosterId, 'roster id');
  userId = requireId(userId, 'user id');
  //email = requireEmail(email, 'email').trim().toLowerCase();
  category = requireString(category, 'category').trim();

  const usersCol = await users();

  // returns the user which contains the given roster
  const userWithRoster = await usersCol.findOne(
    {"rosters._id": rosterId}
  );

  const updatedInfo = await usersCol.updateOne(
    {_id: userWithRoster._id},
    {$pull: {['rosters.' + category]: {_id: userId}}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw 'Error: could not remove roster successfully';
  }

  return {addedToRoster: 'true'};
};

module.exports = {
    getRostersByUserId,
    createRoster,
    deleteRoster,
    addPersonToRoster,
    removePersonFromRoster
};

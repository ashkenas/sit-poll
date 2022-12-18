const e = require("express");
const { ObjectId } = require("mongodb");
const { users } = require("../config/mongoCollections");
const { stringifyId, statusError } = require("../helpers");
const { requireString, requireId, requireEmail, requireEmails, checkCategory } = require("../validation");
const { getUserByEmail } = require("./users");

const updatePassword = async (userId, password) => {
  userId = requireId(userId, 'user Id');
  password = password.trim();
  if(password.length < 6 || !password.match(/[A-Z]/g) || !password.match(/\d/g) || !password.match(/[!-\/:-@\[-`]/g))
    throw statusError(400, "Password must be at least six characters and contain an uppercase letter, a digit, and a special character.");
  
  const usersCol = await users();

  // todo: check if passwords are equal
  /* const user = await usersCol.findOne({_id: userId});
  if(user.password === ) */
  
  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$set: {"password": password}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, 'Error: could not change password');
  }
  
  return {updatedUser: true};
};

const updateDisplayName = async (userId, display_name) => {
  userId = requireId(userId, 'user Id');
  display_name = display_name.trim();
  if(display_name.length < 2)
      throw 'Display name must be at least 2 characters long.';
  if(display_name.match(/[^a-z.' \-]/i))
      throw 'Display name can only contain letters, periods, spaces, and apostrophes.';
  
  const usersCol = await users();

  const user = await usersCol.findOne({_id: userId});
  if(user.display_name === display_name.toLowerCase())
    throw 'Display name cannot be updated to same value';
  
  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$set: {"display_name": display_name}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, 'Error: could not change display name');
  }
  
  return {updatedUser: true};
};

const updateGender = async (userId, gender) => {
  userId = requireId(userId, 'user Id');
  gender = requireString(gender);
  
  const usersCol = await users();

  const user = await usersCol.findOne({_id: userId});
  
  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$set: {"gender": gender}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, 'Error: could not change display name');
  }
  
  return {updatedUser: true};
};

module.exports = {
  updatePassword,
  updateDisplayName,
  updateGender
}
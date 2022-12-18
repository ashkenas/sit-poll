const e = require("express");
const { ObjectId } = require("mongodb");
const { users } = require("../config/mongoCollections");
const { stringifyId, statusError } = require("../helpers");
const { requireString, requireId, requireEmail, requireEmails, checkCategory } = require("../validation");
const { getUserByEmail } = require("./users");

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
    throw statusError(500, 'Error: could not change gender');
  }
  
  return {updatedUser: true};
};

const updateMajorAndSchool = async (userId, major, school) => {
  userId = requireId(userId, 'user Id');
  major = requireString(major);
  school = requireString(school);
  
  const usersCol = await users();

  const user = await usersCol.findOne({_id: userId});

  let updatedInfo = {};

  if (user.school === school) {
    updatedInfo = await usersCol.updateOne(
      {_id: userId},
      {$set: {"major": major}}
    );
  } else {
    updatedInfo = await usersCol.updateOne(
      {_id: userId},
      {$set: {"major": major}},
      {$set: {"school": school}}
    );
  }
  
  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, 'Error: could not major/school');
  }
  
  return {updatedUser: true};
};

module.exports = {
  updateDisplayName,
  updateGender,
  updateMajorAndSchool
}
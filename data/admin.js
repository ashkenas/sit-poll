const e = require("express");
const { ObjectId } = require("mongodb");
const { users } = require("../config/mongoCollections");
const { stringifyId, statusError } = require("../helpers");
const { requireString, requireId, requireEmail, requireEmails } = require("../validation");
const { getUserByEmail, getUserById } = require("./users");

const getAdmins = async () => {
  const usersCol = await users();
  const userList = await usersCol.find({}).toArray();

  const admins = userList.filter((user) => user.is_admin);
  const adminEmails = [];
  admins.forEach((admin) => {
    adminEmails.push(admin.email);
  });
  return adminEmails;
}

const getManagers = async () => {
  const usersCol = await users();
  const userList = await usersCol.find({}).toArray();

  const managers = userList.filter((user) => user.is_manager);
  const managerEmails = [];
  managers.forEach((manager) => {
    managerEmails.push(manager.email);
  });
  return managerEmails;
}

const addAuth = async (userId, authLevel) => {
  userId = requireId(userId);
  authLevel = requireString(authLevel);

  const usersCol = await users();
  const user = await getUserById(userId);
  let status;
  if(authLevel === 'is_admin') {
    status = user.is_admin;
  } else if(authLevel === 'is_manager') {
    status = user.is_manager;
  } else {
    status = true;
  }

  if(status) throw statusError(403, 'User already has authorization/cannot update authorization');

  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$set: {[authLevel]: true}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, `Error: could not update user with roster successfully`);
  }

  return await getUserById(userId);
}

const removeAuth = async (userId, authLevel) => {
  userId = requireId(userId);
  authLevel = requireString(authLevel);

  const usersCol = await users();
  const user = await getUserById(userId);
  let status;
  if(authLevel === 'is_admin') {
    status = user.is_admin;
  } else if (authLevel === 'is_manager') {
    status = user.is_manager;
  } else {
    status = false;
  }

  if(!status) throw statusError(403, 'User already does not have authorization/cannot update authorization');

  const updatedInfo = await usersCol.updateOne(
    {_id: userId},
    {$set: {[authLevel]: false}}
  );

  if (updatedInfo.modifiedCount === 0) {
    throw statusError(500, `Error: could not update user with roster successfully`);
  }

  return await getUserById(userId);
}

module.exports = {
  getAdmins,
  getManagers,
  addAuth,
  removeAuth
}
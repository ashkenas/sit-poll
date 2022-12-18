const express = require('express')
const router = express.Router();
const bcrypt = require('bcryptjs')
const {validate, requireString} = require('../validation');
const { getUserById, changePassword } = require('../data/users');
const { statusError, sync } = require('../helpers');

router
    .route('/')
    .get((req, res) => {
        res.render('password')
    })
    .post(validate([], {'old_password': requireString, 'password1': requireString, 'password2': requireString}), sync(async (req, res) => {
        const { old_password, password1, password2 } = req.body;
        const user = await getUserById(req.session.userId)
        if(!await bcrypt.compare(old_password, user.pass_hash))
            throw statusError(400, "Incorrect current password.")
        if(await bcrypt.compare(password1, user.pass_hash))
            throw statusError(400, "Your new password cannot be the same as your current password.")
        if(password1.length < 6 || !password1.match(/[A-Z]/g) || !password1.match(/\d/g) || !password1.match(/[!-\/:-@\[-`]/g) || password1.match(/\s/g))
            throw statusError(400, "New password must be at least six characters and contain no spaces, an uppercase letter, a digit, and a special character.");
        if(password1 !== password2)
            throw statusError(400, "Your new passwords must match.")

        if((await changePassword(req.session.userId, old_password, password1, password2)).updatedUser)
            return res.json({redirect: '/logout'});
    }));

module.exports = router;
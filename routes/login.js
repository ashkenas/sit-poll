const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

router
    .route('/')
    .get(async (req, res) => {
        // Display login form, should POST to this route
        // Delete these lines after form implementation:
        req.session.userId = ObjectId();
        res.redirect(req.session.redirect ?? '/');
    })
    .post(async (req, res) => {
        // Check that submitted password is valid, then:
        res.redirect(req.session.redirect ?? '/');
    });

module.exports = router;

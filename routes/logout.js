const express = require('express')
const router = express.Router();

router
    .route('/')
    .get((req, res) => {
        req.session.destroy(() => {
            return res.redirect("/")
        });
    });

module.exports = router;
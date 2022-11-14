const express = require('express');
const router = express.Router();

const notImplemented = (res) => res.status(502).send({ error: 'Not implemented.' });

router
    .route('/')
    .post(async (req, res) => { // Create poll
        notImplemented(res);
    });

router
    .route('/:id')
    .get(async (req, res) => { // Get voting page for poll
        notImplemented(res);
    })
    .post(async (req, res) => { // Vote on poll
        notImplemented(res);
    })
    .put(async (req, res) => { // Update poll
        notImplemented(res);
    })
    .delete(async (req, res) => { // Delete poll
        notImplemented(res);
    });

router
    .route('/:id/edit')
    .get(async (req, res) => { // Edit page for poll
        notImplemented(res);
    });

router
    .route('/:id/results')
    .get(async (req, res) => { // Results page for poll
        notImplemented(res);
    });

router
    .route('/:id/comment')
    .post(async (req, res) => { // Create comment on poll
        notImplemented(res);
    });

router
    .route('/:id/react')
    .post(async (req, res) => { // Leave reaction on poll
        notImplemented(res);
    });

module.exports = router;

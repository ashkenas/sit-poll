const express = require('express');
const router = express.Router();

const notImplemented = (res) => res.status(501).send({ error: 'Not implemented.' });

router
    .route('/:id')
    .get(async (req, res) => {
        notImplemented(res);
    })
    .post(async (req, res) => {
        notImplemented(res);
    })
    .put(async (req, res) => {
        notImplemented(res);
    })
    .delete(async (req, res) => {
        notImplemented(res);
    });

router
    .route('/:id/edit')
    .get(async (req, res) => {
        notImplemented(res);
    });

router
    .route('/:id/vote')
    .post(async (req, res) => {
        notImplemented();
    });

router
    .route('/:id/results')
    .get(async (req, res) => {
        notImplemented(res);
    });

router
    .route('/:id/comments')
    .post(async (req, res) => {
        notImplemented(res);
    })
    .delete(async (req, res) => {
        notImplemented(res);
    });

router
    .route('/:id/reactions')
    .post(async (req, res) => {
        notImplemented(res);
    })
    .delete(async (req, res) => {
        notImplemented(res);
    });

module.exports = router;

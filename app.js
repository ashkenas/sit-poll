/*
 * App initialization and start-up.
 */
const path = require('path');
const express = require('express');
const app = express();
const static = express.static(path.join(__dirname, 'public'));
const crypto = require('crypto');

const configRoutes = require('./routes');
const exphbs = require('express-handlebars');
const session = require('express-session');

app.use('/public', static);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET || crypto.randomBytes(16).toString('hex'),
    resave: true
}));
app.use((req, res, next) => { // Redirect if not logged in
    if (req.path !== '/login' && !req.path.startsWith('/public/') && !req.session.userId) {
        if (req.method === 'GET') {
            req.session.redirect = req.originalUrl;
            res.redirect('/login');
        } else {
            res.status(403).json({ error: 'Not logged in.' });
        }
    } else next();
});
app.use((req, res, next) => {
    if (req.method === 'POST' && req.body._method)
        if (['PUT', 'DELETE', 'PATCH'].includes(req.body._method.toUpperCase()))
            req.method = req.body._method;
    next();
});
configRoutes(app);
app.use((err, req, res, next) => { // Error middleware
    if (res.headersSent) return next(err);
    const status = err.status || 500;
    if (req.method === 'GET') {
        res.status(status).render('error', {
            status: status,
            message: err.message || err
        });
    } else {
        res.status(status).json({ error: err.message || err });
    }
});

app.engine('handlebars', exphbs.engine({
    defaultLayout: 'main',
    helpers: {
        equals: (a, b) => a === b,
        date: (d) => {
            const today = (new Date()).toDateString();
            const comp = new Date(d);
            if (today !== comp.toDateString())
                return comp.toLocaleDateString();
            const hour = comp.getHours();
            const strHour = hour % 12 === 0 ? 12 : hour % 12;
            const strMinutes = comp.getMinutes().toString().padStart(2, '0');
            return `${strHour}:${strMinutes} ${hour >= 12 ? 'PM' : 'AM'}`;
        }
    }
}));
app.set('view engine', 'handlebars');

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});

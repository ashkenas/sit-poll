/*
 * App initialization and start-up.
 */
const express = require('express');
const app = express();
const static = express.static(__dirname + '/public');
const crypto = require('crypto');

const configRoutes = require('./routes');
const exphbs = require('express-handlebars');
const session = require('express-session');

app.use('/public', static);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET ?? crypto.randomBytes(16).toString('hex'),
    resave: true
}));
app.use((req, res, next) => { // Redirect if not logged in
    if (req.path !== '/login' && !req.session.userId) {
        req.session.redirect = req.originalUrl;
        res.redirect('/login');
    } else next();
});
app.use((err, req, res, next) => { // Error middleware
    if (res.headersSent) return next(err);
    const status = err.status ? err.status : 500;
    res.status(status).render('error', {
        status: status,
        message: err.message
    });
});

app.engine('handlebars', exphbs.engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

configRoutes(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});

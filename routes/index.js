const path = require('path');
const pollRoutes = require('./polls');
const loginRoutes = require('./login');
const rosterRoutes = require('./rosters');
const adminRoutes = require('./admin');
const createRoutes = require('./create');
const registerRoutes = require('./register');
const editProfileRoutes = require('./editProfile');

const notFound = (name) => (req, res) => {
    res.status(404).render('error', {
        status: 404,
        message: `${name} not found.`
    });
};

const authMiddleware = (req, res, next) => { // Redirect if not logged in
    if (req.path.startsWith('/login') || req.path.startsWith('/register')) {
        if (req.session.userId) res.redirect('/');
        else next();
    } else if (!req.session.userId) {
        if (req.method === 'GET') {
            req.session.redirect = req.originalUrl;
            res.redirect('/login');
        } else {
            res.status(403).json({ error: 'Not logged in.' });
        }
    } else {
        res.locals.session = {
            userId: req.session.userId,
            manager: req.session.manager || req.session.admin || false,
            admin: req.session.admin
        };
        next();
    }
};

const constructorMethod = (app) => {
    app.get('/public/css/bulma.css', (req, res) =>
        res.sendFile(path.join(__dirname, '../node_modules/bulma/css/bulma.css'))
    );
    app.get('/public/*', notFound('Resource'));
    app.get('/favicon.ico', (req, res) => res.redirect('/public/favicon.ico'));

    app.use(authMiddleware); // Authenticate all routes below this
    app.get('/', (req, res) => res.redirect('/polls'));
    app.use('/login', loginRoutes);
    app.use('/polls', pollRoutes);
    app.use('/rosters', rosterRoutes);
    app.use('/admin', adminRoutes);
    app.use('/create', createRoutes);
    app.use('/register', registerRoutes);
    app.use('/editProfile', editProfileRoutes);

    app.use('*', notFound('Page'))
};

module.exports = constructorMethod;

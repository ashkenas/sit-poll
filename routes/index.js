const pollRoutes = require('./polls');
const loginRoutes = require('./login');
const rosterRoutes = require('./rosters');

const constructorMethod = (app) => {
    app.use('/polls', pollRoutes);
    app.use('/login', loginRoutes);
    app.use('/rosters', rosterRoutes);

    app.use('*', (req, res) => {
        res.status(404).render('error', {
            status: 404,
            message: 'Page not found.'
        });
    })
};

module.exports = constructorMethod;

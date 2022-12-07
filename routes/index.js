const path = require('path');
const pollRoutes = require('./polls');
const loginRoutes = require('./login');

const constructorMethod = (app) => {
    app.get('/public/css/bulma.css', (req, res) =>
        res.sendFile(path.join(__dirname, '../node_modules/bulma/css/bulma.css'))
    );
    app.use('/polls', pollRoutes);
    app.use('/login', loginRoutes);

    app.use('*', (req, res) => {
        res.status(404).render('error', {
            status: 404,
            message: 'Page not found.'
        });
    })
};

module.exports = constructorMethod;

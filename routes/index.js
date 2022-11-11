const constructorMethod = (app) => {
    app.use('*', (req, res) => {
        res.status(404).render('error', {
            status: 404,
            message: 'Page not found.'
        });
    })
};

module.exports = constructorMethod;

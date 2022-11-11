/*
 * App initialization and start-up.
 */
const express = require('express');
const app = express();
const static = express.static(__dirname + '/public');

const configRoutes = require('./routes');
const exphbs = require('express-handlebars');

app.use('/public', static);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
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

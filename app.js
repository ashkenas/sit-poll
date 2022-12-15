/*
 * App initialization and start-up.
 */
const WSServer = require('ws').Server;
const path = require('path');
const express = require('express');
const app = express();
const static = express.static(path.join(__dirname, 'public'));
const crypto = require('crypto');
const configRoutes = require('./routes');
const exphbs = require('express-handlebars');
const session = require('express-session');
const { listen } = require('express/lib/application');
const { requirePoll } = require('./data').polls;

const sessionMiddleware = session({
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET || crypto.randomBytes(16).toString('hex'),
    resave: true
});

const verbMiddleware = (req, res, next) => {
    if (req.method === 'POST' && req.body._method)
        if (['PUT', 'DELETE', 'PATCH'].includes(req.body._method.toUpperCase()))
            req.method = req.body._method;
    console.log(req.method);
    next();
};

const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (!err.status) console.error(err);
    const status = err.status || 500;
    const message = err.status ? err.message : 'Interal server error.';
    if (req.method === 'GET') {
        res.status(status).render('error', {
            status: status,
            message: message
        });
    } else {
        res.status(status).json({ error: message });
    }
};

const clients = new Map();
const websocketMiddleware = (req, res, next) => {
    res.updateClients = (poll, type, payload) => {
        const listening = clients.get(poll);
        if (!listening) return;
        listening.forEach(ws => {
            if (ws.id !== req.session.userId) {
                ws.send(JSON.stringify({
                    type: type,
                    data: payload
                }));
            }
        });
    };

    next();
};

app.use('/public', static);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(verbMiddleware);
app.use(websocketMiddleware)
configRoutes(app);
app.use(errorMiddleware);

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
        },
        json: (data) => JSON.stringify(data, null, 4)
    }
}));
app.set('view engine', 'handlebars');

const server = app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});

// From this point on, we have entered the godless lands of websockets
const wsServer = new WSServer({ noServer: true });

// Attempt to authenticate websocket upgrades via our existing sessions
server.on('upgrade', (req, socket, head) => {
    sessionMiddleware(req, {}, () => {
        if (!req.session.userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        // Discard all requests to non ws-supported endpoints
        const match = (/\/polls\/([0-9a-f]{24})\/results/i).exec(req.url);
        if (!match) {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
        }

        req.params = { id: match[1] };
        try {
            // Validate ID and attempt authorization
            requirePoll('id')(req, {}, () => 
                // We are authorized! We can become a websocket now!
                wsServer.handleUpgrade(req, socket, head, ws => {
                    ws.id = req.session.userId;
                    wsServer.emit('connection', ws, req);
                })
            );
        } catch (e) { // Issue occured with validation or authorization
            if (e.status && e.status === 400) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            } else if (e.status && e.status === 403) {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            } else {
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            }

            socket.destroy();
            return;
        }
    });
})

wsServer.on('connection', (ws, req) => {
    const id = req.params.id.toString();
    if (!clients.get(id))
        clients.set(id, [ws]);
    else
        clients.get(id).push(ws);
});

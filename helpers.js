const crypto = require('crypto');
const promisify = require('util').promisify;
const pbkdf2 = promisify(crypto.pbkdf2);

module.exports = {
    statusError(status, message) {
        if (!status) status = 500;
        if (!message) message = "Unknown error.";
        const error = new Error(message);
        error.status = status;
        return error;
    },
    stringifyId(document) {
        return { ...document, _id: document._id.toString() };
    },
    sync(func) {
        return (req, res, next) => func(req, res, next).catch(next);
    },
    async hashPassword (password) {
        const salt = crypto.randomBytes(12); 
        const pass = (await pbkdf2(password, salt, 10000, 64, 'sha512')).toString('hex');
        return `${salt.toString('hex')}$${pass}`;
    }
};

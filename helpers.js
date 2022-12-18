const bcrypt = require('bcryptjs')

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
        return await bcrypt.hash(password, 4);
    }
};

module.exports = {
    statusError(status, message) {
        if (!status) status = 500;
        if (!message) message = "Unknown error.";
        const error = new Error(message);
        error.status = status;
        return error;
    }
};

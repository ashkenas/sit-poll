const { statusError } = require("./helpers")

const exists = (val, name) => {
    if (!val)
        throw statusError(400, `Field '${name}' must be provided.`);
};

module.exports = {
    requireString(string, name) {
        exists(string);
        if (typeof string !== 'string')
            throw statusError(400, `Field '${name}' must be of type string.`);
        if (!(string = string.trim()))
            throw statusError(400, `String '${name}' cannot contain only whitespace.`)
        return string;
    },
    requireInteger(int, name) {
        exists(int);
        if (isNaN((int = +int)) || Math.floor(int) !== int)
            throw statusError(400, `Field '${name}' must be an integer.`);
        return int;
    },
    requireNumber(number, name) {
        exists(number);
        if (isNaN((number = +number)))
            throw statusError(400, `Field '${name}' must be a number.`);
        return number;
    }
}

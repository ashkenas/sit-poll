const { ObjectId } = require("mongodb");
const { statusError } = require("./helpers");

const exists = (val, name) => {
    if (val === undefined || val === null || val === '')
        throw statusError(400, `Field '${name}' must be provided.`);
};

const requireString = (string, name) => {
    exists(string, name);
    if (typeof string !== 'string')
        throw statusError(400, `Field '${name}' must be of type string.`);
    if (!(string = string.trim()))
        throw statusError(400, `String '${name}' cannot contain only whitespace.`)
    return string;
};

const requireInteger = (int, name) => {
    exists(int, name);
    if (isNaN((int = +int)) || Math.floor(int) !== int)
        throw statusError(400, `Field '${name}' must be an integer.`);
    return int;
};

const requireNumber = (number, name) => {
    exists(number, name);
    if (isNaN((number = +number)))
        throw statusError(400, `Field '${name}' must be a number.`);
    return number;
};

const requireId = (id, name) => {
    exists(id, name);
    if (typeof id === 'object' && id instanceof ObjectId && ObjectId.isValid(id))
        return id;
    if (typeof id !== 'string' || !ObjectId.isValid(id))
        throw statusError(400, `Field '${name}' must be a valid ID.`);
    return ObjectId(id);
};

const requireBoolean = (bool, name) => {
    exists(bool, name);
    if (typeof bool === 'string') {
        bool = bool.trim();
        if (bool !== "true" && bool !== "false")
            throw statusError(400, `Field '${name}' must be a valid boolean.`);
        return bool === "true";
    } else if (typeof bool === 'boolean')
        return bool;
    throw statusError(400, `Field '${name}' must be a valid boolean.`);
};

const requireOptions = (options, name) => {
    exists(options, name);
    if (typeof options !== 'object' || !Array.isArray(options))
        throw statusError(400, `Field '${name} must be an array.`);
    if (!options.length)
        throw statusError(400, `Field '${name}' must include at least one option.`);
    options = options.map((option) => option.trim());
    for (const option of options)
        if (!option)
            throw statusError(400, `Field '${name}' cannot have empty options.`);
    return options;
};

const requireDate = (date, name) => {
    exists(date, name);
    date = new Date(date);
    if (isNaN(date.getTime()))
        throw statusError(400, `Field '${name}' is not a valid date.`);
    return date;
};

const dataTypes = {
    _id: requireId,
    email: requireString,
    password: requireString,
    display_name: requireString,
    major: requireString,
    school: requireString,
    gender: requireString,
    is_admin: requireBoolean,
    is_manager: requireBoolean,
    date_of_birth: requireDate,
    class_year: requireInteger,
    label: requireString,
    students: requireOptions,
    assistants: requireOptions,
    title: requireString,
    choices: requireOptions,
    public: requireBoolean,
    close_date: requireDate,
    vote: requireInteger,
    reaction: requireString,
    comment: requireString
};

/**
 * Validates the body of a request according to the provided arguments.
 * Also validates IDs in the URL parameters of a request.
 * @param {string[]} schemaProperties Name of each schema property that must be in the body
 * @param {object} extraProperties Additional properties to validate in {name: validateFunc} pairs
 * @returns 
 */
const validate = (schemaProperties, extraProperties) => {
    if (schemaProperties) {
        if (typeof schemaProperties !== 'object' || !Array.isArray(schemaProperties))
            throw `Argument 'schemaProperties' must be a string array of schema properties.`;
        for (const prop of schemaProperties) {
            if (!prop || typeof prop !== 'string' || !(prop in dataTypes))
                throw `No property '${prop}' found in schema! Move to second argument and add type.`;
        }
    }

    if (extraProperties && typeof extraProperties !== 'object')
        throw `Argument 'extraProperties' must be an object or omitted.`

    return (req, res, next) => {
        if (req.params) { // Validate ObjectIds in the URL
            for (const prop in req.params) {
                if (prop.toLowerCase().endsWith('id'))
                    req.params[prop] = requireId(req.params[prop], prop);
            }
        }

        if (schemaProperties) {
            for(const prop of schemaProperties) // Validate schema properties
                req.body[prop] = dataTypes[prop](req.body[prop], prop);
        }

        if (extraProperties) { // Validate extra properties
            for (const prop in extraProperties)
                req.body.prop = extraProperties[prop](req.body[prop], prop);
        }

        next();
    };
};

const validReactions = {
    like: '👍',
    dislike: '👎'
};

module.exports = {
    requireBoolean,
    requireDate,
    requireId,
    requireInteger,
    requireNumber,
    requireOptions,
    requireString,
    validate,
    validReactions
};

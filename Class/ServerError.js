class ServerError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        Error.captureStackTrace(this, ServerError);
        this.statusCode = statusCode;
        this.code = code;
    }
}

module.exports = ServerError;
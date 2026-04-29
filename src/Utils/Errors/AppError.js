class AppError extends Error {
    constructor(message, statusCode, statusText, details = null) {
        super(message);

        this.statusCode  = statusCode;
        this.statusText  = statusText;
        this.details     = details;
        this.isOperational = true; // Flag: known, intentional errors (not bugs)

        Error.captureStackTrace(this, this.constructor);
    }
}

export { AppError };
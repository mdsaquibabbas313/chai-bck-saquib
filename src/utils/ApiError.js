class ApiError extends Error {

    constructor(
        statusCode,
        // default in comma
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        // for override we use super 
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this , this.constructor)
        }

    }

}

export {ApiError}
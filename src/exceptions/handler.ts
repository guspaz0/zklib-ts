/**
 * Error types for device communication
 */
export const ERROR_TYPES = {
    ECONNRESET: 'ECONNRESET',
    ECONNREFUSED: 'ECONNREFUSED',
    EADDRINUSE: 'EADDRINUSE',
    ETIMEDOUT: 'ETIMEDOUT'
} as const;

type ErrorType = keyof typeof ERROR_TYPES;

interface ErrorInfo {
    message: string;
    code?: ErrorType | string;
}

interface ZkErrorDetails {
    err: {
        message: string;
        code?: string;
    };
    ip: string;
    command: string | number;
}

/**
 * Custom error class for device communication errors
 */
export class ZkError {
    private err: ErrorInfo;
    private ip: string;
    private command: number | string;

    /**
     * Creates a new ZkError instance
     * @param err The error object
     * @param command The command that caused the error
     * @param ip The IP address of the device
     */
    constructor(err: ErrorInfo, command: number | string, ip: string) {
        this.err = err;
        this.ip = ip;
        this.command = command;
    }

    /**
     * Gets a user-friendly error message
     * @returns A formatted error message
     */
    toast(): string {
        if (this.err.code === ERROR_TYPES.ECONNRESET) {
            return 'Another device is connecting to the device so the connection is interrupted';
        } else if (this.err.code === ERROR_TYPES.ECONNREFUSED) {
            return 'IP of the device is refused';
        }
        return this.err.message;
    }

    /**
     * Gets detailed error information
     * @returns An object containing error details
     */
    getError(): ZkErrorDetails {
        return {
            err: {
                message: this.err.message,
                code: this.err.code
            },
            ip: this.ip,
            command: this.command
        };
    }
}

// Export both the class and error types
export default {
    ZkError,
    ERROR_TYPES
};
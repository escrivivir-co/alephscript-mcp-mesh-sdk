export enum LogLevel {
    VERBOSE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
}

export class Logger {
    private static logLevel: LogLevel = LogLevel.INFO;
    private static enableConsoleOutput: boolean = true;
    private static enableTimestamp: boolean = true;

    /**
     * Set the minimum log level
     */
    static setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * Enable or disable console output
     */
    static setConsoleOutput(enabled: boolean): void {
        this.enableConsoleOutput = enabled;
    }

    /**
     * Enable or disable timestamps in log messages
     */
    static setTimestamp(enabled: boolean): void {
        this.enableTimestamp = enabled;
    }

    /**
     * Get current timestamp string
     */
    private static getTimestamp(): string {
        if (!this.enableTimestamp) return '';
        return `[${new Date().toISOString()}] `;
    }

    /**
     * Format log message with optional data
     */
    private static formatMessage(level: string, message: string, data?: any): string {
        const timestamp = this.getTimestamp();
        const prefix = `${timestamp}[${level}] ${message}`;
        
        if (data !== undefined) {
            if (typeof data === 'object') {
                return `${prefix} ${JSON.stringify(data, null, 2)}`;
            }
            return `${prefix} ${data}`;
        }
        
        return prefix;
    }

    /**
     * Internal logging method
     */
    private static log(level: LogLevel, levelName: string, message: string, data?: any): void {
        if (level < this.logLevel || !this.enableConsoleOutput) {
            return;
        }

        const formattedMessage = this.formatMessage(levelName, message, data);

        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevel.INFO:
                console.info(formattedMessage);
                break;
            case LogLevel.DEBUG:
                console.debug(formattedMessage);
                break;
            case LogLevel.VERBOSE:
                console.log(formattedMessage);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    /**
     * Verbose logging - most detailed
     */
    static v(message: string, data?: object): void {
        this.log(LogLevel.VERBOSE, 'VERBOSE', message, data);
    }

    /**
     * Debug logging
     */
    static d(message: string, data?: any): void {
        this.log(LogLevel.DEBUG, 'DEBUG', message, data);
    }

    /**
     * Info logging
     */
    static i(message: string, data?: object): void {
        this.log(LogLevel.INFO, 'INFO', message, data);
    }

    /**
     * Info logging (alias)
     */
    static info(message: string, data?: object): void {
        this.log(LogLevel.INFO, 'INFO', message, data);
    }

    /**
     * Warning logging
     */
    static w(message: string, data?: object): void {
        this.log(LogLevel.WARN, 'WARN', message, data);
    }

    /**
     * Error logging
     */
    static e(message: string, data?: object | any): void {
        this.log(LogLevel.ERROR, 'ERROR', message, data);
    }
}

export { Logger as l }
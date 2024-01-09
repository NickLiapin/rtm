const { createLogger, format, transports } = require('winston');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {formatDate} = require('../common_functions');

/**
 * Logger class using Winston. Implements the Singleton pattern.
 * Automatically initializes the logger with environment settings.
 */
class Logger {
    static instance;

    /**
     * Initializes the Logger instance. If an instance already exists, it returns that instance.
     * Automatically sets up the logger upon creation.
     */
    constructor() {
        if (Logger.instance) {
            return Logger.instance;
        }

        this.envName = process.env.ENV_NAME;
        this.logDir = path.join(__dirname, process.env.PATH_TO_LOGS_DIRECTORY, this.envName, formatDate());
        this.setupLogger();
        Logger.instance = this;
    }

    /**
     * Creates the log directory if it doesn't exist using synchronous method.
     */
    createLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Sets up the Winston logger.
     */
    setupLogger() {
        this.createLogDirectory();
        this.logger = createLogger({
            format: format.combine(
                format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                format.printf(info => `${info.timestamp} | ${this.envName} | ${info.level}: ${info.message}`)
            ),
            transports: [
                new transports.Console(),
                new transports.File({ filename: path.join(this.logDir, 'errors.log'), level: 'error' }),
                new transports.File({ filename: path.join(this.logDir, 'all-logs.log') }),
            ],
        });
    }

    /**
     * Provides access to the singleton instance of the logger.
     * @returns {Logger} The singleton logger instance.
     */
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }


    /**
     * Logs a message at the 'info' level.
     * @param {string} message - Message to be logged.
     */
    info(message) {
        this.logger.info(message);
    }

    /**
     * Logs a message at the 'error' level.
     * @param {string} message - Message to be logged.
     */
    error(message) {
        this.logger.error(message);
    }

    /**
     * Logs a message at the 'warn' level.
     * @param {string} message - Message to be logged.
     */
    warn(message) {
        this.logger.warn(message);
    }
}

module.exports = Logger;

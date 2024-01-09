const Logger = require('../logger');
const logger = Logger.getInstance();
const axios = require('axios');
const { yesOrNo, formatDateEST } = require('../common_functions')

class Slack {
    constructor(localEnv) {
        this.localEnv = localEnv;
    }

    /**
     * Posts a message in a Slack channel
     * Informs about startup configuration
     * @returns {Promise<void>}
     */
    async slackReportStart() {
        if (this.localEnv.ENABLE_SLACK_REPORT) {
            const unixTimestamp = Math.floor(this.localEnv.startProgram.getTime() / 1000);
            let message = `:large_green_circle:   *RTM update started*  <!date^${unixTimestamp}^{date_num}   {time_secs}|${formatDateEST(unixTimestamp)}>\n` +
                `      Enable "RTM" page update: *${yesOrNo(this.localEnv.ENABLE_UPDATE_RTM)}*\n` +
                `      Enable "RTM - statistics" page update: *${yesOrNo(this.localEnv.ENABLE_UPDATE_STAT)}*\n` +
                `      Enable Jira task create: *${yesOrNo(this.localEnv.ENABLE_JIRA_TASK)}*\n` +
                `      Enable QASE sync: *${yesOrNo(this.localEnv.ENABLE_QASE)}*\n` +
                `      Enable E-Mail reporting: *${yesOrNo(this.localEnv.ENABLE_EMAIL_REPORT)}*\n`;
            await this.slackRequest(message);
        }
    }

    /**
     * Posts a message in a Slack channel
     * Informs about the completion of the launch and publishes links to the results
     * @returns {Promise<void>}
     */
    async slackReportStop() {
        if (this.localEnv.ENABLE_SLACK_REPORT) {
            const stopProgram = new Date();
            const unixTimestamp = Math.floor(stopProgram.getTime() / 1000);
            let message = `:stopwatch:   *RTM  update completed!* <!date^${unixTimestamp}^{date_num}   {time_secs}|${formatDateEST(unixTimestamp)}>\n`;
            message += `      *Time spent:* ${this.calculateExecutionTime()}\n`;
            message += this.localEnv.ENABLE_UPDATE_RTM ? `      "RTM" page: <https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${this.localEnv.CONFLUENCE_RTM_PAGE_ID}|Updated RTM page>\n` : ``;
            message += this.localEnv.ENABLE_UPDATE_STAT ?
                `      "RTM - statistics" page: <https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${this.localEnv.CONFLUENCE_STATISTIC_PAGE_ID}|Updated RTM statistics page>\n` : ``;

            let jiraMessage = "";

            if(this.localEnv.forSlackReport.jira_task.lastResponse) {
                jiraMessage = `      JIRA - new task created: <https://${this.localEnv.JIRA_DOMAIN}/browse/${this.localEnv.forSlackReport.jira_task.lastResponse.key}|${this.localEnv.forSlackReport.jira_task.lastResponse.key}>\n`
            } else {
                jiraMessage = '      JIRA - new task created: no updates in requirements\n'
            }
            message += this.localEnv.ENABLE_JIRA_TASK ? jiraMessage : '';


            let emailStatus = "";
            if(this.localEnv.forSlackReport.email.status) {
                emailStatus = "      E-Mail: Updates sent!"
            } else {
                emailStatus = "      E-Mail: Didn't send email updates - no updates"
            }

            message += this.localEnv.ENABLE_EMAIL_REPORT ? emailStatus : '';

            await this.slackRequest(message);
        } else {
            logger.info("Slack report - is disabled");
        }
    }

    /**
     * Calculates the execution time of a program or a function.
     * @returns {string} A string representing the execution time in minutes, seconds, and milliseconds
     *                   if the total time exceeds 60 seconds, otherwise in seconds and milliseconds.
     */
    calculateExecutionTime() {
        // Capture the current time (end of execution)
        const end = new Date();

        // Calculate the execution duration in milliseconds
        const duration = end - this.localEnv.startProgram;

        // Convert to seconds and milliseconds
        const seconds = Math.floor(duration / 1000);
        const milliseconds = duration % 1000;

        let result;

        // If the execution time is more than 60 seconds, convert to minutes, seconds, and milliseconds
        if (seconds > 60) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            result = `*${minutes}* minutes *${remainingSeconds}* seconds *${milliseconds}* milliseconds`;
        } else {
            result = `*${seconds}* seconds *${milliseconds}* milliseconds`;
        }

        return result;
    }

    /**
     * The main function of sending messages to a Slack channel
     * @param {string} message
     * @returns {Promise<void>}
     */
    async slackRequest(message) {
        axios.post('https://slack.com/api/chat.postMessage', {
            channel: this.localEnv.SLACK_CHANNEL_ID,
            text: message, // Оставляем эту строку для обеспечения совместимости с API
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": message
                    }
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${this.localEnv.SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json' // Убедитесь, что используется правильный тип контента
            }
        }).then(response => {
            logger.info('Message sent to Slack channel');
        }).catch(error => {
            logger.error(`Error #1012 of sending a message: ${error}`);
        });
    }

}


module.exports = Slack;

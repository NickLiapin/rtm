const Logger = require('../logger');
const logger = Logger.getInstance();
const AdfBuilder = require('../adf_builder');
const axios = require("axios");


class JiraManager {
    constructor(localEnv) {
        this.localEnv = localEnv;
        this.adfBuilder = new AdfBuilder(localEnv);
    }

    async createJiraTask() {
        if (!this.localEnv.ENABLE_JIRA_TASK)
        {
            logger.info(`Jira task creation - is disabled.`);
            return
        }
            try {
                const adfStructure = this.adfBuilder.atlassianDocumentFormatBuilder(this.localEnv.globalCache);

                if(adfStructure.content.length > 0) {
                    const now = new Date();
                    const formattedDate = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear(); // Format MM/DD/YYYY
                    await this.createJiraIssue(`Review (${formattedDate}) updates to the requirements`, adfStructure, 'Task');
                }
                this.localEnv.forSlackReport.jira_task.status = true;
                let jiraMessage = "";
                if(!this.localEnv.forSlackReport.jira_task.lastResponse) {
                    jiraMessage = 'JIRA - new task created: no updates in requirements';
                    logger.info(jiraMessage);
                }
            } catch (error) {
                this.localEnv.forSlackReport.jira_task.status = false;
                logger.error(`Error #1013 ${this.localEnv.forSlackReport.jira_task.message} ${error}`);
            }
    }

    async createJiraIssue(summary, descriptionADF, issueType) {
        try {
            const response = await axios.post(
                `https://${this.localEnv.JIRA_DOMAIN}/rest/api/3/issue`,
                {
                    fields: {
                        project: {
                            key: this.localEnv.JIRA_PROJECT_KEY
                        },
                        summary: summary,
                        description: descriptionADF, // Используйте ADF для описания
                        issuetype: {
                            name: issueType
                        },
                        components: [
                            {
                                "name": this.localEnv.JIRA_COMPONENT_NAME
                            }
                        ]
                    }
                },
                {
                    auth: {
                        username: this.localEnv.JIRA_USERNAME,
                        password: this.localEnv.JIRA_TOKEN
                    },
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info(`Jira Issue created: ID:${response.data.id} Key:${response.data.key} Link:${response.data.self}`);
            this.localEnv.forSlackReport.jira_task.lastResponse = response.data;
        } catch (error) {
            logger.error(`Error #1014 creating issue: ${error.response?.data || error.message}`);
        }
    }
}

module.exports = JiraManager;

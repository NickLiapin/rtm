const startProgram = new Date();  // At the beginning of the program
const path = require("path");
const {yesOrNo, toBoolean, formatDate} = require('./common_functions/index')
// require('dotenv').config({path: path.join(__dirname, '../.env.sandbox')});
const Logger = require('./logger'); // attention, the logger must connect before the other classes
const logger = Logger.getInstance(); // first init
const CacheManager = require('./cache_manager');
const StatisticsManager = require('./statistics_manager');
const ConfluenceManager = require('./confluence_manager');
const SlackManager = require('./slack_manager');
const JiraManager = require('./jira_manager');
const EmailManager = require('./email_manager')

class Index {
    constructor(
        //----- main configuration -----
        ENV_NAME = process.env.ENV_NAME ? process.env.ENV_NAME : "default",
        PATH_TO_LOGS_DIRECTORY = process.env.PATH_TO_LOGS_DIRECTORY ? process.env.PATH_TO_LOGS_DIRECTORY : '../logs',
        CONFLUENCE_DOMAIN = process.env.CONFLUENCE_DOMAIN,
        CONFLUENCE_CATALOG_PAGE_ID = process.env.CONFLUENCE_CATALOG_PAGE_ID,
        CONFLUENCE_RTM_PAGE_ID = process.env.CONFLUENCE_RTM_PAGE_ID,
        CONFLUENCE_STATISTIC_PAGE_ID = process.env.CONFLUENCE_STATISTIC_PAGE_ID,
        CONFLUENCE_USERNAME = process.env.CONFLUENCE_USERNAME,
        CONFLUENCE_TOKEN = process.env.CONFLUENCE_TOKEN,
        CONFLUENCE_ABBR = process.env.CONFLUENCE_ABBR,
        QASE_ABBR = process.env.QASE_ABBR,
        REG_EXP_AC = process.env.REG_EXP_AC,
        REG_EXP_CASES = process.env.REG_EXP_CASES,
        REG_EXP_AUTOMATION_STATUS = process.env.REG_EXP_AUTOMATION_STATUS,
        SELECT_AUTOMATION_STATUS = process.env.SELECT_AUTOMATION_STATUS,
        SHOW_NEED_AUTOMATE_AC = process.env.SHOW_NEED_AUTOMATE_AC,
        ENABLE_UPDATE_RTM = process.env.CONFLUENCE_UPDATE_RTM,
        ENABLE_UPDATE_STAT = process.env.CONFLUENCE_UPDATE_STAT,

        //------ qase.io configuration -----
        ENABLE_QASE = process.env.ENABLE_QASE,
        QASE_TOKEN = process.env.QASE_TOKEN,
        QASE_CODE = process.env.QASE_CODE,
        QASE_MAX_REQUESTS_PER_MINUTE = process.env.QASE_MAX_REQUESTS_PER_MINUTE,

        //------ Slack configuration ------
        ENABLE_SLACK_REPORT = process.env.ENABLE_SLACK_REPORT,
        SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN,
        SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID,

        //------ Jira configuration ------
        ENABLE_JIRA_TASK = process.env.ENABLE_JIRA_TASK,
        JIRA_DOMAIN = process.env.JIRA_DOMAIN,
        JIRA_USERNAME = process.env.JIRA_USERNAME,
        JIRA_TOKEN = process.env.JIRA_TOKEN,
        JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY,
        JIRA_COMPONENT_NAME = process.env.JIRA_COMPONENT_NAME,

        //----- E-mail configuration -----
        ENABLE_EMAIL_REPORT = process.env.ENABLE_EMAIL_REPORT,
        EMAIL_SERVICE = process.env.EMAIL_SERVICE,
        EMAIL_USER = process.env.EMAIL_USER,
        EMAIL_PASSWORD = process.env.EMAIL_PASSWORD,
        EMAIL_TO = process.env.EMAIL_TO,
        EMAIL_SUBJECT = process.env.EMAIL_SUBJECT,
        EMAIL_IMG = process.env.EMAIL_IMG


    ) {
        this.localEnv = {
            startProgram: startProgram,
            ENV_NAME: ENV_NAME,
            PATH_TO_LOGS_DIRECTORY: PATH_TO_LOGS_DIRECTORY,
            PATH_TO_CACHE: `${path.resolve('cache.' + ENV_NAME + '.json')}`,
            PATH_TO_STATISTICS: `${path.resolve('statistics.' + ENV_NAME + '.json')}`,
            CONFLUENCE_DOMAIN: CONFLUENCE_DOMAIN,
            CONFLUENCE_BASE_URL: `http://${CONFLUENCE_DOMAIN}/wiki/rest/api/content`,
            CONFLUENCE_CATALOG_PAGE_ID: CONFLUENCE_CATALOG_PAGE_ID,
            CONFLUENCE_RTM_PAGE_ID: CONFLUENCE_RTM_PAGE_ID,
            CONFLUENCE_STATISTIC_PAGE_ID: CONFLUENCE_STATISTIC_PAGE_ID,
            CONFLUENCE_USERNAME: CONFLUENCE_USERNAME,
            CONFLUENCE_TOKEN: CONFLUENCE_TOKEN,
            CONFLUENCE_ABBR: CONFLUENCE_ABBR,
            QASE_ABBR: QASE_ABBR,
            patternCriteria: REG_EXP_AC.split('|')[0],
            flagsCriteria: REG_EXP_AC.split('|')[1],
            patternCases: REG_EXP_CASES.split('|')[0],
            flagsCases: REG_EXP_CASES.split('|')[1],
            isAutomatableRegex: new RegExp(REG_EXP_AUTOMATION_STATUS),
            SELECT_AUTOMATION_STATUS: toBoolean(SELECT_AUTOMATION_STATUS),
            SHOW_NEED_AUTOMATE_AC: toBoolean(SHOW_NEED_AUTOMATE_AC),
            ENABLE_UPDATE_RTM: toBoolean(ENABLE_UPDATE_RTM),
            ENABLE_UPDATE_STAT: toBoolean(ENABLE_UPDATE_STAT),
            ENABLE_QASE: toBoolean(ENABLE_QASE),
            QASE_TOKEN: QASE_TOKEN,
            QASE_CODE: QASE_CODE,
            QASE_MAX_REQUESTS_PER_MINUTE: QASE_MAX_REQUESTS_PER_MINUTE,
            ENABLE_SLACK_REPORT: toBoolean(ENABLE_SLACK_REPORT),
            SLACK_BOT_TOKEN: SLACK_BOT_TOKEN,
            SLACK_CHANNEL_ID: SLACK_CHANNEL_ID,
            ENABLE_JIRA_TASK: toBoolean(ENABLE_JIRA_TASK),
            JIRA_DOMAIN: JIRA_DOMAIN,
            JIRA_USERNAME: JIRA_USERNAME,
            JIRA_TOKEN: JIRA_TOKEN,
            JIRA_PROJECT_KEY: JIRA_PROJECT_KEY,
            JIRA_COMPONENT_NAME: JIRA_COMPONENT_NAME,
            ENABLE_EMAIL_REPORT: toBoolean(ENABLE_EMAIL_REPORT),
            EMAIL_SERVICE: EMAIL_SERVICE,
            EMAIL_USER: EMAIL_USER,
            EMAIL_PASSWORD: EMAIL_PASSWORD,
            EMAIL_TO: EMAIL_TO,
            EMAIL_SUBJECT: EMAIL_SUBJECT,
            EMAIL_IMG: EMAIL_IMG,
            AUTH: Buffer.from(`${CONFLUENCE_USERNAME}:${CONFLUENCE_TOKEN}`).toString('base64'), // Encoding credentials in base64 format for HTTP Basic Auth

            logDir: path.join(__dirname, '../logs', ENV_NAME, formatDate()),
            logger: null, // инициализация будет в основной функции
            auth: Buffer.from(`${CONFLUENCE_USERNAME}:${CONFLUENCE_TOKEN}`).toString('base64'), // кодирование учетных данных в формате base64
            globalCache: undefined, // здесь будет храниться кэш из файла cache.json
            oldGlobalCache: undefined, // хранит копию старого образа кэша на время всей сессии
            initialLaunch: undefined, // Это первый запуск? после проверки может содержать true/false
            automatedGlobalCases: [], // например [100, 101];
            needAutomateGlobalAC: [], // например [{ id: '123456789', title: 'Page 1', content: [ 'AC-1' ] }]
            forSlackReport: {
                rtm: { status: false, lastResponse: null, errorMessage: "Ошибка при обновлении страницы" },
                rtm_statistics: { status: false, lastResponse: null, errorMessage: "Ошибка при обновлении страницы" },
                jira_task: { status: false, lastResponse: null, errorMessage: "Ошибка при создании задачи" },
                qase_sync: { status: false, lastResponse: null, errorMessage: "Ошибка при синхронизации случаев" },
                email: { status: false, lastResponse: null, errorMessage: "Ошибка при отправке почты" }
            },
            statistic: {
                old: {
                    requirements: 0,
                    acceptanceCriteria: 0,
                    acceptanceCriteriaWithoutTests: 0,
                    acceptanceCriteriaAutomatable: 0,
                    testCases: 0,
                    automationNotValidCases: 0,
                    automatedCases: 0,
                    acceptanceCriteriaAutomated: 0
                },
                new: {
                    requirements: 0,
                    acceptanceCriteria: 0,
                    acceptanceCriteriaWithoutTests: 0,
                    acceptanceCriteriaAutomatable: 0,
                    testCases: 0,
                    automationNotValidCases: 0,
                    automatedCases: 0,
                    acceptanceCriteriaAutomated: 0
                }
            }
        }
    }

    /**
     * Logs the launch of the configuration
     */
    configToLog() {
        logger.info('---configuration---');
        logger.info(`RTM update enabled: ${yesOrNo(this.localEnv.ENABLE_UPDATE_RTM)}`);
        logger.info(`RTM statistics update enabled: ${yesOrNo(this.localEnv.ENABLE_UPDATE_STAT)}`);
        logger.info(`Jira task creation enabled: ${yesOrNo(this.localEnv.ENABLE_JIRA_TASK)}`);
        logger.info(`qase.io informer enabled: ${yesOrNo(this.localEnv.ENABLE_QASE)}`);
        logger.info(`E-mail report enabled: ${yesOrNo(this.localEnv.ENABLE_EMAIL_REPORT)}`);
        logger.info(`Slack report enabled: ${yesOrNo(this.localEnv.ENABLE_SLACK_REPORT)}`);
        logger.info('-------------------');
    }

    /**
     * The main function of the application.
     * It performs several key operations:
     * 1. Loads the old cache data from 'cache.json', if available.
     * 2. Sets the old statistics based on the loaded cache. If it's the first run, all statistics are set to zero.
     * 3. Fetches the content of the page with the ID stored in `CONFLUENCE_CATALOG_PAGE_ID`.
     * 4. If the page content is successfully retrieved, it saves this data to 'cache.json'.
     * 5. Loads the new cache (updated with the latest data) from 'cache.json'.
     * 6. Sets new statistics based on the new cache.
     * 7. Updates the 'statistics.json' file with the new statistics.
     * 8. Updates the Requirements Traceability Matrix (RTM) page.
     * 9. Updates the statistics page.
     */
    start = async () => {
        logger.info('------------------------- Start -------------------------');
        this.configToLog(); // Logs the launch of the configuration
        const slackManager = new SlackManager(this.localEnv);

        await slackManager.slackReportStart();

        const cacheManager = CacheManager.getInstance(`cache.${this.localEnv.ENV_NAME}.json`, this.localEnv);
        const statisticsManager = new StatisticsManager(this.localEnv);

        await statisticsManager.updateStatisticsFile();
        await statisticsManager.setOldStatistic();

        this.localEnv.initialLaunch = Boolean(!this.localEnv.oldGlobalCache);  // set initialLaunch

        const confluenceManager = new ConfluenceManager(this.localEnv);

        cacheManager.newCache = await confluenceManager.getConfluencePages();
        await statisticsManager.setNewStatistic(cacheManager.newCache);
        await statisticsManager.addOrUpdateStatistic();

        await confluenceManager.updateRTMPage();

        await confluenceManager.updateStatisticPage();

        const jiraManager = new JiraManager(this.localEnv);
        await jiraManager.createJiraTask();


        // await emailReport(); // send e-mail
        const emailManager = new EmailManager(this.localEnv);
        await emailManager.emailReport()

        // await slackReportStop(); // create Slack report
        await slackManager.slackReportStop();

    }
}

const main = new Index();
main.start().catch(error => {
    console.log(`Error - "Main" class: ${error}\n${error.stackTrace}`);
});

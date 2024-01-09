const Logger = require('../logger');
const logger = Logger.getInstance();
const fs = require('fs').promises;
const {dirname} = require("path");
const QaseManager = require('../qase_manager');


class StatisticsManager {
    constructor(localEnv) {
        this.localEnv = localEnv;
    }

    /**
     * sets the statistics of the last run to statistic.old
     */
    async setOldStatistic() { // set statistics from the last launch if there is a statistics, otherwise everything will remain at zero
        const obj = await this.loadStatistic(this.localEnv.PATH_TO_STATISTICS_FILE);
        if (obj) {
            this.localEnv.statistic.old = {...obj.statistics[obj.statistics.length - 2].data};
        }
    }

    /**
     * sets the statistics of the current run to statistic.new
     * @param cache - cache taken from the cache.json file
     */
    async setNewStatistic(cache) {
        if (cache) {
            const cacheCopy = JSON.parse(JSON.stringify(cache)); // so as not to change the values
            const data = this.getCompilationData(cacheCopy);  // scan after updating the cache
            const stat = await this.calculateCounts(data);
            this.localEnv.statistic.new = {...stat};
        }
    }

    /**
     * The function returns data from the statistic file or null.
     * @param cacheFile - path to the cache file
     * @returns {Promise<any|null>}
     */
    async loadStatistic(cacheFile) {
        try {
            const data = await fs.readFile(cacheFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    /**
     * Updates the structure of the statistics file based on the current data model.
     * It adds new fields and removes outdated ones from each entry in the statistics.
     *
     * @returns {Promise<void>} A promise representing the completion of the file update process.
     */
    async updateStatisticsFile() {
        try {
            const filePath = this.localEnv.PATH_TO_STATISTICS_FILE;
            // Check if the file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                // File does not exist, no need to update
                logger.info('Statistics file does not exist. No update required.');
                return;
            }

            // Read the existing file content
            const fileContent = await fs.readFile(filePath, 'utf8');
            const statisticsFromFile = JSON.parse(fileContent);
            let isUpdated = false;

            // Iterate over each statistics entry and update
            statisticsFromFile.statistics.forEach(entry => {
                // Add new fields if they don't exist
                for (const key in this.localEnv.statistic.new) {
                    if (!(key in entry.data)) {
                        entry.data[key] = 0;
                        isUpdated = true;
                    }
                }

                // Remove outdated fields
                for (const key in entry.data) {
                    if (!(key in this.localEnv.statistic.new)) {
                        delete entry.data[key];
                        isUpdated = true;
                    }
                }
            });

            // Rewrite the file if there were changes
            if (isUpdated) {
                const updatedContent = JSON.stringify(statisticsFromFile, null, 2);
                try {
                    // Extracting the directory path from the full file path
                    const dirPath = dirname(filePath);

                    // Ensuring that the directory exists
                    await fs.mkdir(dirPath, { recursive: true });

                    await fs.writeFile(filePath, updatedContent, 'utf8');
                    logger.info('The statistics file structure has been successfully updated.');
                } catch (error) {
                    logger.error(`An error occurred while updating the statistics file structure: ${error.message}`);
                }




            } else {
                logger.info('Updating the statistics file structure is not required.');
            }
        } catch (error) {
            // Log any errors encountered
            logger.error(`An error #1017 occurred while updating the statistics file structure: ${error}`);
        }
    }

    /**
     * receiving prepared data from cache.json
     * @param data - cache
     * @returns {*[]} - array with prepared data
     */
    getCompilationData(data) {

        if(!data) return null;

        const criteriaRegex = new RegExp(this.localEnv.patternCriteria, this.localEnv.flagsCriteria);
        let flattened = [];



        const processNode = (node) => {
            if (node.content && criteriaRegex.test(String(node.content))) {   // node.content.includes(">AC-")
                criteriaRegex.lastIndex = 0; // index reset due to /g expression flag
                node.content = this.extractContent(node.content);
                let {children_ID, children, ...nodeWithoutChildren} = node;
                flattened.push(nodeWithoutChildren);
            }

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => processNode(child));
            }
        }

        processNode(data);
        return flattened
    }

    /**
     * Extracts and processes criteria and test cases from a given HTML string.
     * It identifies each criterion and its associated test cases, also determining
     * whether the criterion can be automated based on the presence of [NA].
     * @param {string} html - The HTML string from which to extract the content.
     * @returns {Object[]} An array of objects, each representing a criterion with its name,
     */
    extractContent(html) {
        const criteriaRegex = new RegExp(this.localEnv.patternCriteria, this.localEnv.flagsCriteria);
        const testCaseRegex = new RegExp(this.localEnv.patternCases, this.localEnv.flagsCases);

        let match;
        const results = [];

        while ((match = criteriaRegex.exec(html)) !== null) {
            const text = match[1];
            const description = match[2];

            // Проверяем, есть ли в описании [NA]
            const isAutomatable =
                this.localEnv.SELECT_AUTOMATION_STATUS ?
                    this.localEnv.isAutomatableRegex.test(description) :
                    !this.localEnv.isAutomatableRegex.test(description);

            let testCases = [];
            let testCaseMatch;
            while ((testCaseMatch = testCaseRegex.exec(description)) !== null) {
                testCases.push(...testCaseMatch[1].split(',').map(s => s.trim()));
            }

            const filteredTestCases = testCases.filter(item => item !== '');

            results.push({
                name: text,
                isAutomatable: isAutomatable,
                cases: filteredTestCases
            });
        }

        return results;
    }

    /**
     * Calculation of statistics for the latest update.
     * @param data - Data prepared for the calculation.
     * @returns {Promise<{acceptanceCriteria: number, acceptanceCriteriaAutomatable: number, requirements, automationNotValidCases: number, testCases: number, automatedCases: number, acceptanceCriteriaWithoutTests: number}>}
     */
    async calculateCounts(data) {
        const counts = {
            requirements: data.length, // number of objects
            acceptanceCriteria: 0, // number of AC (Acceptance Criteria)
            acceptanceCriteriaWithoutTests: 0,
            acceptanceCriteriaAutomatable: 0,
            testCases: 0, // number of unique test cases
            automationNotValidCases: 0,
            automatedCases: 0,
            acceptanceCriteriaAutomated: 0
        };

        const uniqTests = new Set();  // record only unique cases
        const uniqAutomationValidCases = new Set(); // record only automation valid cases
        const uniqAutomationNotValidCases = new Set(); // record only automation NOT valid cases

        data.forEach(item => {
            counts.acceptanceCriteria += item.content.length; // count AC in each object

            item.content.forEach(contentItem => {
                const isAutomatable = contentItem.isAutomatable;

                if (contentItem.cases.length === 0) {
                    counts.acceptanceCriteriaWithoutTests += 1;
                }
                if(isAutomatable) {
                    counts.acceptanceCriteriaAutomatable += 1;
                }

                if (contentItem.cases.length > 0) {
                    contentItem.cases = contentItem.cases
                        .filter(CASE => CASE && CASE.match(/\d+/))
                        .map(CASE => {
                            return CASE.match(/\d+/)[0]; // Extract a number from a string CASE-12345 => 12345
                        })

                    contentItem.cases.forEach(element => {
                        uniqTests.add(element)  // recording all cases in SET to control uniqueness
                        if(isAutomatable) {
                            uniqAutomationValidCases.add(element);
                        } else {
                            uniqAutomationNotValidCases.add(element);
                        }
                    });
                }

            });
        });

        if(this.localEnv.ENABLE_QASE) {

            const qaseManager = new QaseManager(
                this.localEnv.QASE_CODE,
                this.localEnv.QASE_TOKEN,
                this.localEnv.QASE_MAX_REQUESTS_PER_MINUTE
            );

            let automatedCases = await qaseManager.checkAutomatedTestCases([...uniqAutomationValidCases]);

            counts.automatedCases = automatedCases.length;
            this.localEnv.automatedGlobalCases.push(...automatedCases); // save to global array

            // Adds items to a global array based on specific criteria.
            const notAutomated = qaseManager.getNeedAutomateAC(data, this.localEnv.automatedGlobalCases, this.localEnv.needAutomateGlobalAC);
            counts.acceptanceCriteriaAutomated = counts.acceptanceCriteriaAutomatable - notAutomated;
        } else {
            counts.automatedCases = Number(this.localEnv.statistic.old.automatedCases);
            counts.acceptanceCriteriaAutomated = Number(this.localEnv.statistic.old.acceptanceCriteriaAutomated);
        }

        counts.automationNotValidCases = uniqAutomationNotValidCases.size;
        counts.testCases = uniqTests.size;

        return counts;
    }

    /**
     * Adds a new statistics entry to the statistics file
     * If there is no file it is created and 1 record is automatically added 36 months before the current date
     * @returns {Promise<void>}
     */
    async addOrUpdateStatistic() {
        const filePath = this.localEnv.PATH_TO_STATISTICS_FILE;
        const newData = this.localEnv.statistic.new;
        try {
            const currentDate = new Date().toISOString().split('T')[0];

            // Calculate the date 36 months before the current moment
            const date36MonthsAgo = new Date();
            date36MonthsAgo.setMonth(date36MonthsAgo.getMonth() - 36);
            const date36MonthsAgoStr = date36MonthsAgo.toISOString().split('T')[0];

            let fileContent;

            try {
                await fs.access(filePath);
                const data = await fs.readFile(filePath, 'utf8');
                fileContent = JSON.parse(data);
            } catch {
                // Create a file with statistics for 36 months with zero parameters
                fileContent = {
                    statistics: [
                        {
                            date: date36MonthsAgoStr,
                            data: {
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
                    ]
                };
            }

            const existingEntryIndex = fileContent.statistics.findIndex(entry => entry.date === currentDate);

            if (existingEntryIndex >= 0) {
                fileContent.statistics[existingEntryIndex].data = newData;
                logger.info(`Existing entry for today updated in statistics.${this.localEnv.ENV_NAME}.json`);
            } else {
                const newRecord = {
                    date: currentDate,
                    data: newData
                };
                fileContent.statistics.push(newRecord);
                logger.info(`New entry for today added to statistics.${this.localEnv.ENV_NAME}.json`);
            }

            try {
                // Extracting the directory path from the full file path
                const dirPath = dirname(filePath);

                // Ensuring that the directory exists
                await fs.mkdir(dirPath, { recursive: true });


                await fs.writeFile(filePath, JSON.stringify(fileContent, null, 2), 'utf8');
            } catch  {

            }

        } catch (error) {
            logger.error(`Error #1011 while working with the statistics.${this.localEnv.ENV_NAME}.json file:\n\n ${error}`);
        }
    }

}

module.exports = StatisticsManager;

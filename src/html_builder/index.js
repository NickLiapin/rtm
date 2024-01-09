const Logger = require('../logger'); // attention, the logger must connect before the other classes
const logger = Logger.getInstance(); // first init
const fs = require('fs').promises;
const { replaceDelTags, findNodeById } = require('../common_functions')
const diff = require('diff');
class HtmlBuilder {

    constructor(localEnv) {
        this.localEnv = localEnv;
    }

    /**
     * builds HTML code for the RTM page
     * @returns {string} - html
     */
    htmlRTMBuilder() {
        const cacheCopy = JSON.parse(JSON.stringify(this.localEnv.globalCache)); // so as not to change the values
        const jsonData = this.getCompilationData(cacheCopy);  // scan after updating the cache
        const oldCacheCopy = JSON.parse(JSON.stringify(this.localEnv.oldGlobalCache));
        const oldJsonData = this.getCompilationData(oldCacheCopy);

        // Start of HTML table
        let htmlTable =
            '<table style="width: 100%;">' +   //data-table-width="1500"
            '<colgroup>' +
            '<col style="width: 150px;" />' +
            '<col style="width: 650px;" />' +
            '<col style="width: 700px;" />' +
            '</colgroup>' +
            '<tr>' +
            '<th class="confluenceTh"><strong>Requirement ID</strong></th>' +
            '<th class="confluenceTh"><strong>Requirement Description</strong></th>' +
            '<th class="confluenceTh"><strong>AC : Test cases IDs</strong></th></tr>';

        const addCasesHtml = (item) => {
            item.content.forEach((contentItem) => {
                let cases = contentItem.cases.map(CASE => {
                    let caseNumber = CASE.match(/\d+/)[0]; // Extract a number from a string CASE-12345 => 12345
                    return `<a href="https://app.qase.io/project/${this.localEnv.QASE_ABBR}?case=${caseNumber}">${this.localEnv.QASE_ABBR}-${caseNumber}</a>`;
                }).join(', ');
                htmlTable += `<li>${contentItem.name}: ${cases || '<ac:structured-macro ac:name="status">' +
                '<ac:parameter ac:name="colour">Red</ac:parameter>' +
                '<ac:parameter ac:name="title">No test cases attached</ac:parameter>' +
                '<ac:parameter ac:name="subtle">false</ac:parameter>' +
                '</ac:structured-macro>'}</li>`;
            });
        }

        // Generate Deleted rows
        if (oldJsonData) {
            oldJsonData.forEach((item) => {
                const exists = jsonData.some(newObj => newObj.id === item.id);
                if(!exists) {
                    let deletedStyle = ' data-highlight-colour="#ffebe6"';

                    htmlTable +=
                        `<tr><td${deletedStyle} class="confluenceTd" data-colwidth="200">Deleted: ${item.id}</td>` +
                        `<td${deletedStyle} class="confluenceTd">${item.title}` +
                        '<ac:structured-macro ac:name="expand">' +
                        '<ac:parameter ac:name="title">Deleted info</ac:parameter>' +
                        '<ac:rich-text-body>' +
                        '<p>' +
                        `${replaceDelTags(this.generateDiffHtml(item.content_text, item.content_text))}` +
                        '</p>' +
                        '</ac:rich-text-body>' +
                        '</ac:structured-macro>' +
                        '</td>' +
                        `<td${deletedStyle} class="confluenceTd"><ul>`;

                    addCasesHtml(item);

                    htmlTable += '</ul></td></tr>';

                }
            })
        }

        // Generate table rows
        jsonData.forEach((item) => {
            let requirementLink = `https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${item.id}`;
            let updatedStyle = item.updated && !this.localEnv.initialLaunch ? ' data-highlight-colour="#e6fcff"' : '';
            let updateInfo = item.updated && !this.localEnv.initialLaunch ? this.getDiffTextToHtml(item) : '';
            htmlTable +=
                `<tr><td${updatedStyle} class="confluenceTd" data-colwidth="200"><a href="${requirementLink}">${item.id}</a></td>
            <td${updatedStyle} class="confluenceTd">${item.title}${updateInfo}</td>
            <td${updatedStyle} class="confluenceTd"><ul>`;

            addCasesHtml(item);

            htmlTable += '</ul></td></tr>';
        });

        htmlTable += '</table>'; // Completing the table

        return htmlTable;
    }

    /**
     * Main function for getting statistics
     * @param filePath - path to the statistics file
     * @returns {Promise<*[][]|*[]>} - an array with two statistics [0] - 30 days and [1] - 12 months
     */
    getStatistics = async (filePath) => {
        try {
            // Read and parse data from a file
            const data = await fs.readFile(filePath, 'utf8');
            const fileContent = JSON.parse(data);
            const statistics = fileContent.statistics;

            // Get data for the last 30 days
            const last30DaysData = this.getLastNDaysData(30, statistics);

            // Get data for the last 12 months
            const last12MonthsData = this.getLastNMonthsData(12, statistics);

            // Return an array with two statistics objects
            return [last30DaysData, last12MonthsData];
        } catch (error) {
            logger.error(`Error #1006 reading file "${filePath}":\n\n${error}`);
            return [];
        }
    }

    /**
     * Function to get data for the last N days
     * @param n - number of days
     * @param statistics - data from the statistics.json file
     * @returns {*[]} - data selection based on the last days condition
     */
    getLastNDaysData(n, statistics) {
        const lastNDaysData = [];
        let lastKnownData = null;

        for (let i = 0; i < n; i++) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - i);
            const formattedTargetDate = targetDate.toISOString().split('T')[0];

            // Find the last known record before or on this date
            const foundData = this.findLatestDataBeforeDate(formattedTargetDate, statistics, lastKnownData);
            lastKnownData = foundData;

            lastNDaysData.push({
                date: formattedTargetDate,
                data: foundData ? foundData.data : {}
            });
        }

        return lastNDaysData;
    }

    /**
     * Function to get data for the last N months
     * @param n - number of last months
     * @param statistics - statistics from the statistics.json file
     * @returns {*[]} - selection of the last 12 months
     */
    getLastNMonthsData(n, statistics) {
        const lastNMonthsData = [];
        let lastKnownData = null;

        for (let i = 0; i < n; i++) {
            const targetDate = new Date();
            targetDate.setMonth(targetDate.getMonth() - i);
            const formattedTargetMonth = targetDate.toISOString().split('T')[0].slice(0, 7); // Get YYYY-MM format

            // Find the last known record before or for this month
            const foundData = this.findLatestDataBeforeMonth(formattedTargetMonth, statistics, lastKnownData);
            lastKnownData = foundData;

            lastNMonthsData.push({
                date: formattedTargetMonth,
                data: foundData ? foundData.data : {}
            });
        }

        return lastNMonthsData;
    }

    /**
     * helper function to get data for the last N months
     * @param targetMonth - target month
     * @param statistics - statistics
     * @param lastKnownData - last known date
     * @returns {*}
     */
    findLatestDataBeforeMonth(targetMonth, statistics, lastKnownData) {
        for (let i = statistics.length - 1; i >= 0; i--) {
            const statMonth = statistics[i].date.slice(0, 7);
            if (statMonth <= targetMonth) {
                return statistics[i];
            }
        }
        return lastKnownData;
    }

    /**
     * helper function to get data for the last N days
     * @param targetDate - target day
     * @param statistics - statistics
     * @param lastKnownData - last known date
     * @returns {*}
     */
    findLatestDataBeforeDate(targetDate, statistics, lastKnownData) {
        for (let i = statistics.length - 1; i >= 0; i--) {
            if (statistics[i].date <= targetDate) {
                return statistics[i];
            }
        }
        return lastKnownData;
    }

    /**
     * Main HTML code builder for RTM statistics page
     * @returns {Promise<string>}
     */
    async htmlStatisticBuilder() {
        const timeLine = await this.getStatistics(this.localEnv.PATH_TO_STATISTICS);
        const timeLineDays = timeLine[0].slice().reverse(); // copy and reverse of the array - we need the old data at the beginning
        const timeLineMonth = timeLine[1].slice().reverse(); // copy and reverse of the array - we need the old data at the beginning

        function generateHtmlWithHighlight(number) {
            let attribute = '';
            let sign = number >= 0 ? '+' : '';

            if (number < 0) {
                attribute = ' data-highlight-colour="#ffebe6"';
            } else if (number > 0) {
                attribute = ' data-highlight-colour="#e3fcef"';
            }
            // If the number is 0, the attribute is not added

            return `<td${attribute}>${sign}${number}</td>`;
        }

        /**
         * Generates table rows for timeLine chart
         * @param dataArray - array with data ordered by date
         * @returns {*} - html code
         */
        const generateTimeLineHtmlTable = (dataArray) => {
            return dataArray.map(item => {
                const {date, data} = item;
                const formattedDate = date;
                const requirements = data.requirements;
                const acceptanceCriteria = data.acceptanceCriteria;
                const testCases = data.testCases;
                const automatedCases = this.localEnv.ENABLE_QASE ? `<td>${data.automatedCases}</td>` : "";

                return `<tr>
              <td>${formattedDate}</td>
              <td>${requirements}</td>
              <td>${acceptanceCriteria}</td>
              <td>${testCases}</td>
              ${automatedCases}
            </tr>`;
            }).join('');
        }

        const needAutomate = () => {
            let htmlTable = "";

            function acToString(acArray) {
                return acArray.join(', ');
            }

            this.localEnv.needAutomateGlobalAC.forEach((item) => {
                let requirementLink = `https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${item.id}`;
                htmlTable +=
                    `<tr><td class="confluenceTd" data-colwidth="200"><a href="${requirementLink}">${item.id}</a></td>
            <td class="confluenceTd">${item.title}</td>
            <td class="confluenceTd">${acToString(item.content)}</td></tr>`;
            });
            return htmlTable;
        }

        const lastUpdateChartWithQase = this.localEnv.ENABLE_QASE ? `<tr><td>Automated</td><td>${this.localEnv.statistic.old.automatedCases}</td><td>${this.localEnv.statistic.new.automatedCases}</td></tr>` : '';
        const lastUpdateChart =
            '<ac:structured-macro ac:name="chart">' +
            '<ac:parameter ac:name="type">bar</ac:parameter>' +
            '<ac:parameter ac:name="title">Last update</ac:parameter>' +
            '<ac:parameter ac:name="dataOrientation">vertical</ac:parameter>' +
            '<ac:parameter ac:name="width">750</ac:parameter>' +
            '<ac:parameter ac:name="3d">true</ac:parameter>' +
            '<ac:parameter ac:name="opacity">50</ac:parameter>' +
            '<ac:parameter ac:name="colors">#BBBBFF, #CCFFCC</ac:parameter>' +
            '<ac:parameter ac:name="height">600</ac:parameter>' +
            '<ac:rich-text-body>' +
            '<table>' +
            '<tr>' +
            '<th>Acceptance criteria</th>' +
            '<th>Before update</th>' +
            '<th>After update</th>' +
            '</tr>' +
            '<tr>' +
            '<td>Requirements</td>' +
            `<td>${this.localEnv.statistic.old.requirements}</td>` +
            `<td>${this.localEnv.statistic.new.requirements}</td>` +
            '</tr>' +
            '<tr>' +
            '<td>Acceptance criteria</td>' +
            `<td>${this.localEnv.statistic.old.acceptanceCriteria}</td>` +
            `<td>${this.localEnv.statistic.new.acceptanceCriteria}</td>` +
            '</tr>' +
            '<tr>' +
            '<td>Test cases</td>' +
            `<td>${this.localEnv.statistic.old.testCases}</td>` +
            `<td>${this.localEnv.statistic.new.testCases}</td>` +
            '</tr>' +
            `${lastUpdateChartWithQase}` +
            '</table>' +
            '</ac:rich-text-body>' +
            '</ac:structured-macro>'

        const lastUpdateTableWithQase = this.localEnv.ENABLE_QASE ? `<tr><th>Automated</th><td>${this.localEnv.statistic.old.automatedCases}</td><td>${this.localEnv.statistic.new.automatedCases}</td>${generateHtmlWithHighlight(this.localEnv.statistic.new.automatedCases - this.localEnv.statistic.old.automatedCases)}</tr>` : '';
        const lastUpdateTable =
            '<ac:structured-macro ac:name="table">' +
            '<ac:parameter ac:name="title">Last Update table</ac:parameter>' +
            '<ac:rich-text-body>' +
            '<table>' +
            '<tbody>' +
            '<tr>' +
            '<th></th> <!-- The empty cell for the left-top corner -->' +
            '<th>Before update</th>' +
            '<th>After update</th>' +
            '<th>Difference</th>' +
            '</tr>' +
            '<tr>' +
            '<th>Requirements</th>' +
            `<td>${this.localEnv.statistic.old.requirements}</td>` +
            `<td>${this.localEnv.statistic.new.requirements}</td>` +
            `${generateHtmlWithHighlight(this.localEnv.statistic.new.requirements - this.localEnv.statistic.old.requirements)}` +
            '</tr>' +
            '<tr>' +
            '<th>Acceptance criteria</th>' +
            `<td>${this.localEnv.statistic.old.acceptanceCriteria}</td>` +
            `<td>${this.localEnv.statistic.new.acceptanceCriteria}</td>` +
            `${generateHtmlWithHighlight(this.localEnv.statistic.new.acceptanceCriteria - this.localEnv.statistic.old.acceptanceCriteria)}` +
            '</tr>' +
            '<tr>' +
            '<th>Test cases</th>' +
            `<td>${this.localEnv.statistic.old.testCases}</td>` +
            `<td>${this.localEnv.statistic.new.testCases}</td>` +
            `${generateHtmlWithHighlight(this.localEnv.statistic.new.testCases - this.localEnv.statistic.old.testCases)}` +
            '</tr>' +
            `${lastUpdateTableWithQase}` +
            '</tbody>' +
            '</table>' +
            '</ac:rich-text-body>' +
            '</ac:structured-macro>' +
            '<br />' +
            '<br />' +
            '<br />' +
            '<br />'

        const testCoverageChart =
            '<ac:structured-macro ac:name="chart" ac:schema-version="1" ac:macro-id="unique-macro-id-1">' +
            '<ac:parameter ac:name="type">pie</ac:parameter>' +
            '<ac:parameter ac:name="title">Test coverage of acceptance criteria</ac:parameter>' +
            '<ac:parameter ac:name="opacity">50</ac:parameter>' +
            '<ac:parameter ac:name="dataOrientation">vertical</ac:parameter>' +
            '<ac:parameter ac:name="width">750</ac:parameter>' +
            '<ac:parameter ac:name="3d">true</ac:parameter>' +
            '<ac:parameter ac:name="colors">#BBBBFF, #CCFFCC</ac:parameter>' +
            '<ac:parameter ac:name="height">600</ac:parameter>' +
            '<ac:rich-text-body>' +
            '<table>' +
            '<tr>' +
            '<th>Acceptance criteria</th>' +
            '<th>Counts</th>' +
            '</tr>' +
            '<tr>' +
            '<td>AC not covered by tests</td>' +
            `<td>${this.localEnv.statistic.new.acceptanceCriteriaWithoutTests}</td>` +
            '</tr>' +
            '<tr>' +
            '<td>AC covered by tests</td>' +
            `<td>${this.localEnv.statistic.new.acceptanceCriteria - this.localEnv.statistic.new.acceptanceCriteriaWithoutTests}</td>` +
            '</tr>' +
            '</table>' +
            '</ac:rich-text-body>' +
            '</ac:structured-macro>' +
            '<br />' +
            '<br />' +
            '<br />'

        let testAutomationCoverageChart = '';
        if(this.localEnv.ENABLE_QASE) {
            testAutomationCoverageChart =
                '<ac:structured-macro ac:name="chart" ac:schema-version="1" ac:macro-id="unique-macro-id-2">' +
                '<ac:parameter ac:name="type">pie</ac:parameter>' +
                '<ac:parameter ac:name="title">Acceptance criteria covered by automation</ac:parameter>' +
                '<ac:parameter ac:name="opacity">50</ac:parameter>' +
                '<ac:parameter ac:name="dataOrientation">vertical</ac:parameter>' +
                '<ac:parameter ac:name="width">750</ac:parameter>' +
                '<ac:parameter ac:name="3d">true</ac:parameter>' +
                '<ac:parameter ac:name="colors">#BBBBFF, #CCFFCC</ac:parameter>' +
                '<ac:parameter ac:name="height">600</ac:parameter>' +
                '<ac:rich-text-body>' +
                '<table>' +
                '<tr>' +
                '<th>Acceptance criteria</th>' +
                '<th>Counts</th>' +
                '</tr>' +
                '<tr>' +
                '<td>Not automated cases</td>' +
                `<td>${this.localEnv.statistic.new.acceptanceCriteriaAutomatable - this.localEnv.statistic.new.acceptanceCriteriaAutomated}</td>` +
                '</tr>' +
                '<tr>' +
                '<td>Automated cases</td>' +
                `<td>${this.localEnv.statistic.new.acceptanceCriteriaAutomated}</td>` +
                '</tr>' +
                '</table>' +
                '</ac:rich-text-body>' +
                '</ac:structured-macro>' +
                '<br />' +
                '<br />' +
                '<br />'
        }


        const timeLine30days =
            '<ac:structured-macro ac:name="chart" ac:schema-version="2" ac:macro-id="unique-macro-id-3">' +
            '<ac:parameter ac:name="title">Time line chart: last 30 days</ac:parameter>' +
            '<ac:parameter ac:name="type">timeSeries</ac:parameter>' +
            '<ac:parameter ac:name="dateFormat">yyyy-MM-dd</ac:parameter>' +
            '<ac:parameter ac:name="timePeriod">Day</ac:parameter>' +
            '<ac:parameter ac:name="dataOrientation">vertical</ac:parameter>' +
            '<ac:parameter ac:name="rangeAxisLowerBound">0</ac:parameter>' +
            '<ac:parameter ac:name="rangeAxisStep">1</ac:parameter>' +
            '<ac:parameter ac:name="domainaxisrotateticklabel">true</ac:parameter>' +
            `<ac:parameter ac:name="colors">red, blue, #0aa653 ${this.localEnv.ENABLE_QASE ? ', #7914b8' : ''}</ac:parameter>` +
            '<ac:parameter ac:name="width">750</ac:parameter>' +
            '<ac:parameter ac:name="height">600</ac:parameter>' +
            '<ac:parameter ac:name="opacity">30</ac:parameter>' +
            '<ac:rich-text-body>' +
            '<table>' +
            '<tr>' +
            '<th>Date</th>' +
            '<th>Requirements</th>' +
            '<th>Acceptance criteria</th>' +
            '<th>Test cases</th>' +
            `${this.localEnv.ENABLE_QASE ? "<th>Automated cases</th>" : ""}` +
            '</tr>' +
            `${generateTimeLineHtmlTable(timeLineDays)}` +
            '</table>' +
            '</ac:rich-text-body>' +
            '</ac:structured-macro>' +
            '<br />' +
            '<br />' +
            '<br />'

        const timeLine12Months =
            '<ac:structured-macro ac:name="chart" ac:schema-version="1" ac:macro-id="unique-macro-id-4">' +
            '<ac:parameter ac:name="title">Time line chart: last 12 months</ac:parameter>' +
            '<ac:parameter ac:name="type">timeSeries</ac:parameter>' +
            '<ac:parameter ac:name="dateFormat">yyyy-MM</ac:parameter>' +
            '<ac:parameter ac:name="timePeriod">Month</ac:parameter>' +
            '<ac:parameter ac:name="dataOrientation">vertical</ac:parameter>' +
            '<ac:parameter ac:name="rangeAxisLowerBound">0</ac:parameter>' +
            '<ac:parameter ac:name="rangeAxisStep">1</ac:parameter>' +
            '<ac:parameter ac:name="domainaxisrotateticklabel">true</ac:parameter>' +
            `<ac:parameter ac:name="colors">red, blue, #0aa653 ${this.localEnv.ENABLE_QASE ? ', #7914b8' : ''}</ac:parameter>` +
            '<ac:parameter ac:name="width">750</ac:parameter>' +
            '<ac:parameter ac:name="height">600</ac:parameter>' +
            '<ac:parameter ac:name="opacity">30</ac:parameter>' +
            '<ac:rich-text-body>' +
            '<table>' +
            '<tr>' +
            '<th>Date</th>' +
            '<th>Requirements</th>' +
            '<th>Acceptance criteria</th>' +
            '<th>Test cases</th>' +
            `${this.localEnv.ENABLE_QASE ? "<th>Automated cases</th>" : ""}` +
            '</tr>' +
            `${generateTimeLineHtmlTable(timeLineMonth)}` +
            '</table>' +
            '</ac:rich-text-body>' +
            '</ac:structured-macro>' +
            '<br />' +
            '<br />' +
            '<br />' +
            '<br />'

        let needAutomateCases = '';
        if (this.localEnv.ENABLE_QASE && this.localEnv.SHOW_NEED_AUTOMATE_AC && this.localEnv.needAutomateGlobalAC.length > 0) {
            needAutomateCases =
                '<h1>Acceptance criteria to be automated</h1>' +
                '<ac:structured-macro ac:name="table">' +
                '<ac:parameter ac:name="title">Acceptance criteria to be automated</ac:parameter>' +
                '<ac:rich-text-body>' +
                '<table>' +
                '<tbody>' +
                '<colgroup>' +
                '<col style="width: 100px" />' +
                '<col style="width: 200px" />' +
                '<col style="width: 200px" />' +
                '</colgroup>' +
                '<tr>' +
                '<th>ID</th>' +
                '<th>Title</th>' +
                '<th>AC</th>' +
                '</tr>' +
                `${needAutomate()}` +
                '</tbody>' +
                '</table>' +
                '</ac:rich-text-body>' +
                '</ac:structured-macro>' +
                '<br />' +
                '<br />' +
                '<br />' +
                '<br />'
        }

        return lastUpdateChart + lastUpdateTable + testCoverageChart + testAutomationCoverageChart + timeLine30days + timeLine12Months + needAutomateCases;
    }

    /**
     * Generates HTML content representing the differences between two texts.
     * It highlights the removed parts in red and the added parts in green.
     * @param {string} oldText - The original text.
     * @param {string} newText - The modified text to compare with the original.
     * @returns {string} HTML string showing the differences with appropriate color coding.
     */
    generateDiffHtml(oldText, newText) {
        // Use diff.diffLines to compare the texts line by line
        const changes = diff.diffLines(oldText, newText);
        let resultHtml = '';

        changes.forEach((part) => {
            // If the part is removed from the original text, wrap it in a span with red color
            if (part.removed) {
                resultHtml += `<span style="color: red;">${part.value}</span>`;
            }
            // If the part is added in the new text, wrap it in a span with green color
            else if (part.added) {
                resultHtml += `<span style="color: green;">${part.value}</span>`;
            }
            // For unchanged parts, append them as-is
            else {
                resultHtml += part.value;
            }
        });

        // Replace newline characters with <br /> for HTML display
        return resultHtml.replace(/\n/g, '<br />');
    }

    /**
     * Generates HTML content showing the differences between the old and new versions of a given item.
     * It uses the 'findNodeById' function to retrieve the old version of the item from a cache.
     * If the old version is not found in the cache, it returns an empty string.
     * Otherwise, it generates and returns HTML content highlighting the differences.
     * @param {Object} item - The new version of the item, containing 'id', 'title', and 'content_text'.
     * @returns {string} - HTML string showing the differences, or an empty string if the old version is not found.
     */
    getDiffTextToHtml = (item) => {
        // Search for the old version of the item in the cache using its ID
        const oldNode = findNodeById(this.localEnv.oldGlobalCache, item.id);

        // If the old version is not found, return an empty string
        if (!oldNode) {
            return '';
        }

        // Concatenate the title and content_text of the old version
        const oldText = `Title of page:\n${oldNode.title}\n\n${oldNode.content_text}`;
        // Concatenate the title and content_text of the new version
        const newText = `Title of page:\n${item.title}\n\n${item.content_text}`;

        // Generate HTML content showing the differences between the old and new versions
        const contentHtml = this.generateDiffHtml(oldText, newText);

        // Construct the final HTML string using a Confluence 'expand' macro to display the differences
        return '<ac:structured-macro ac:name="expand">' +
            '<ac:parameter ac:name="title">Update info</ac:parameter>' +
            '<ac:rich-text-body>' +
            '<p>' +
            replaceDelTags(contentHtml) +
            '</p>' +
            '</ac:rich-text-body>' +
            '</ac:structured-macro>';
    }

    /**
     * receiving prepared data from cache.json
     * @param data - cache
     * @returns {*[]} - array with prepared data
     */
    getCompilationData = (data)=> {

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
    extractContent = (html) => {
        const criteriaRegex = new RegExp(this.localEnv.patternCriteria, this.localEnv.flagsCriteria);
        const testCaseRegex = new RegExp(this.localEnv.patternCases, this.localEnv.flagsCases);

        let match;
        const results = [];

        while ((match = criteriaRegex.exec(html)) !== null) {
            const text = match[1];
            const description = match[2];

            // Проверяем, есть ли в описании [NA]
            const isAutomatable = this.localEnv.SELECT_AUTOMATION_STATUS ? this.localEnv.isAutomatableRegex.test(description) : !this.localEnv.isAutomatableRegex.test(description);

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

}


module.exports = HtmlBuilder

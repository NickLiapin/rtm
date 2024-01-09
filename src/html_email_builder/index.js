const diff = require("diff");
const {findNodeById} = require('../common_functions');

class HtmlEmailBuilder {
    constructor(localEnv) {
        this.localEnv = localEnv;
    }

    htmlToMail() {
        const cacheCopy = JSON.parse(JSON.stringify(this.localEnv.globalCache)); // so as not to change the values
        const jsonData = this.getCompilationData(cacheCopy);  // scan after updating the cache
        const oldCacheCopy = JSON.parse(JSON.stringify(this.localEnv.oldGlobalCache));
        const oldJsonData = this.getCompilationData(oldCacheCopy);

        let html =
            '<!DOCTYPE html>' +
            '<html>' +
            '<head>' +
            '<style>' +
            '.new-text { color: green; }' +
            '.removed-text { color: red; }' +
            '.normal-text { color: black; }' +
            'ul { list-style: none; }' +
            '.logo-text {' +
            'font-family: Arial, sans-serif;' +
            'padding: 0 10px;' +
            'vertical-align: middle;' +
            '}' +
            '.content { padding: 5px; }' +
            '.link { color: blue; text-decoration: underline; }' +
            '.divider { border-top: 1px solid #b6b6b6; margin: 10px 0; }' +
            '</style>' +
            '</head>' +
            '<body>' +
            '<table width="100%" cellspacing="0" cellpadding="0">' +
            '<tr>' +
            '<td align="center">' +
            '<table width="200px" cellspacing="0" cellpadding="0" style="background-color: white;">' +
            '<tr>' +
            '<td class="logo-text"><h1>RTM</h1></td>' +
            '<td align="center">' +
            `<img src="${this.localEnv.EMAIL_IMG}" alt="logo">` +
            '</td>' +
            '<td class="logo-text"><h1>Report</h1></td>' +
            '</tr>' +
            '</table>' +
            '</td>' +
            '</tr>'

        // Generate remove table rows
        oldJsonData.forEach((item) => {
            const exists = jsonData.some(newObj => newObj.id === item.id);
            if(!exists) {
                this.localEnv.forSlackReport.email.status = true;
                let removeInfo = this.getRemoveTextToMail(item);
                html +=
                    '<tr>' +
                    '<td class="divider"></td>' +
                    '</tr>'+
                    '<tr>' +
                    '<td class="content">' +
                    `Deleted: ${item.id}` +
                    removeInfo +
                    '</td>' +
                    '</tr>'
            }
        })

        // Generate update table rows
        jsonData.forEach((item) => {

            let requirementLink = `https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${item.id}`;
            let updateInfo = item.updated && !this.localEnv.initialLaunch ? this.getDiffTextToMail(item) : '';

            if(updateInfo !== '') {
                this.localEnv.forSlackReport.email.status = true;
                html +=
                    '<tr>' +
                    '<td class="divider"></td>' +
                    '</tr>'+
                    '<tr>' +
                    '<td class="content">' +
                    `Update: <a href="${requirementLink}" class="link">${item.id}</a>` +
                    updateInfo +
                    '</td>' +
                    '</tr>'
            }

            if(item.updated && updateInfo === '') {
                this.localEnv.forSlackReport.email.status = true;
                html +=
                    '<tr>' +
                    '<td class="divider"></td>' +
                    '</tr>' +
                    '<tr>' +
                    '<td class="content">' +
                    `New requirement: <a href="${requirementLink}" class="link">${item.id}</a>` +
                    '</td>' +
                    '</tr>'
            }
        });

        html += '</table>' +
            '</body>' +
            '</html>'

        return html;
    }


    getRemoveTextToMail(item) {
        // Concatenate the title and content_text of the old version
        const oldText = `Title of page:\n${item.title}\n\n${item.content_text}`;

        // Generate HTML content showing the differences between the old and new versions
        const contentHtml = this.generateDiffMail(oldText, oldText);

        // Construct the final HTML string using a Confluence 'expand' macro to display the differences
        return '<ul>' +
            contentHtml +
            '</ul>';
    }


    getDiffTextToMail(item) {
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
        const contentHtml = this.generateDiffMail(oldText, newText);

        // Construct the final HTML string using a Confluence 'expand' macro to display the differences
        return '<ul>' +
            contentHtml +
            '</ul>';
    }



    generateDiffMail(oldText, newText) {
        // Use diff.diffLines to compare the texts line by line
        const changes = diff.diffLines(oldText, newText);
        let resultHtml = '';

        /**
         * Replaces all occurrences of '{{del}}' with '<del>' and '{{/del}}' with '</del>' in a given text.
         * @param {string} text - The text in which to perform the replacements.
         * @returns {string} - The text after performing the replacements.
         */
        function replaceDelTags(text) {
            return text.replace(/{{del}}/g, '<del>')
                .replace(/{{\/del}}/g, '</del>');
        }

        changes.forEach((part) => {
            // If the part is removed from the original text, wrap it in a span with red color
            if (part.removed) {
                resultHtml += `<li class="removed-text">${replaceDelTags(part.value)}</li>`;
            }
            // If the part is added in the new text, wrap it in a span with green color
            else if (part.added) {
                resultHtml += `<li class="new-text">${replaceDelTags(part.value)}</li>`;
            }
            // For unchanged parts, append them as-is
            else {
                resultHtml += `<li class="normal-text">${replaceDelTags(part.value)}</li>`;
            }
        });

        // Replace newline characters with <br /> for HTML display
        return resultHtml.replace(/\n/g, '<br />');
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

module.exports = HtmlEmailBuilder;

const {findNodeById} = require('../common_functions');
const diff = require('diff');

class AdfBuilder {
    constructor(localEnv) {
        this.localEnv = localEnv;
    }

    atlassianDocumentFormatBuilder() {
        const cacheCopy = JSON.parse(JSON.stringify(this.localEnv.globalCache)); // so as not to change the values
        const jsonData = this.getCompilationData(cacheCopy);  // scan after updating the cache
        const oldCacheCopy = JSON.parse(JSON.stringify(this.localEnv.oldGlobalCache));
        const oldJsonData = this.getCompilationData(oldCacheCopy);

        let ADFStructure =
            {
                "version": 1,
                "type": "doc",
                "content": []
            }

        // Generate Deleted rows
        oldJsonData.forEach((item) => {
            const exists = jsonData.some(newObj => newObj.id === item.id);
            if(!exists) {
                const deletedRequirement = [
                    {
                        "type": "paragraph",
                        "content": []
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": `Requirement deleted: ${item.id}`,
                            }
                        ]
                    },
                    {
                        "type": "expand",
                        "attrs": {
                            "title": "Deleted info"
                        },
                        "content": this.getDeletedDiffTextToADF(item)
                    }];
                ADFStructure.content.push(...deletedRequirement);

            }
        })

        // Generate Updated
        jsonData.forEach((item) => {
            const oldNode = findNodeById(this.localEnv.oldGlobalCache, item.id);
            if(item.updated && oldNode) { // it`s update node
                const updateRequirement = [
                    {
                        "type": "paragraph",
                        "content": []
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Requirement updated: ",
                            },
                            {
                                "type": "text",
                                "text": `${item.id}`,
                                "marks": [
                                    {
                                        "type": "link",
                                        "attrs": {
                                            "href": `https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${item.id}`
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "expand",
                        "attrs": {
                            "title": "Last update"
                        },
                        "content": this.getDiffTextToADF(item)
                    }];
                ADFStructure.content.push(...updateRequirement);
            }

            if(!oldNode) { // it`s new node    //New requirement found: 5445334
                const newRequirement =
                    [{
                        "type": "paragraph",
                        "content": []
                    },
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "New requirement found: ",
                                },
                                {
                                    "type": "text",
                                    "text": `${item.id}`,
                                    "marks": [
                                        {
                                            "type": "link",
                                            "attrs": {
                                                "href": `https://${this.localEnv.CONFLUENCE_DOMAIN}/wiki/spaces/${this.localEnv.CONFLUENCE_ABBR}/pages/${item.id}`
                                            }
                                        }
                                    ]
                                }
                            ]
                        }];
                ADFStructure.content.push(...newRequirement);
            }
        });

        return ADFStructure;
    }

    getDeletedDiffTextToADF(item) {
        const nodeText = `Title of page:\n${item.title}\n\n${item.content_text}`;
        return this.generateDiffADF(nodeText, nodeText);
    }

    /**
     * Generates a diff representation in Atlassian Document Format (ADF) from two given texts.
     *
     * @param {string} oldText - The original text.
     * @param {string} newText - The updated text.
     * @returns {Array} An array of ADF paragraphs representing the diff between the two texts.
     */
    generateDiffADF(oldText, newText) {
        const changes = diff.diffLines(oldText, newText);
        let resultADF = [];

        // Processing each diff part
        changes.forEach(part => {
            // Determine the color based on whether the part was added or removed
            const color = part.removed ? "#FF0000" : part.added ? "#199319" : null;

            // Process each part of the text for ADF node creation
            let content = this.processTextForADF(part.value, color);

            // Creating a paragraph for each processed part
            resultADF.push({
                "type": "paragraph",
                "content": content
            });
        });

        return resultADF;
    }

    /**
     * Processes a given text segment to generate ADF nodes, handling strikethrough markers and color.
     * @param {string} text - The text segment to be processed.
     * @param {string|null} color - The color to be applied to the text, null if no color is needed.
     * @returns {Array} An array of ADF nodes representing the processed text.
     */
    processTextForADF(text, color) {
        let processed = [];
        let currentText = "";
        let isStrikethrough = false;

        // Splitting the text into segments based on strikethrough markers
        const segments = text.split(/({{del}}|{{\/del}})/);

        segments.forEach(segment => {
            if (segment === "{{del}}") {
                // If there's accumulated text, push it as a node
                if (currentText) {
                    processed.push(this.createADFNode(currentText, isStrikethrough, color));
                    currentText = "";
                }
                isStrikethrough = true;
            } else if (segment === "{{/del}}") {
                // If there's accumulated strikethrough text, push it as a node
                if (currentText) {
                    processed.push(this.createADFNode(currentText, isStrikethrough, color));
                    currentText = "";
                }
                isStrikethrough = false;
            } else {
                // Accumulate text
                currentText += segment;
            }
        });

        // Push the remaining text, if any
        if (currentText) {
            processed.push(this.createADFNode(currentText, isStrikethrough, color));
        }

        return processed;
    }

    /**
     * Creates an ADF node with the given text, applying strikethrough and/or color if needed.
     * @param {string} text - The text for the ADF node.
     * @param {boolean} isStrikethrough - Whether the text should be strikethrough.
     * @param {string|null} color - The color of the text, null if no color is needed.
     * @returns {Object} An ADF node representing the text with the specified styling.
     */
    createADFNode(text, isStrikethrough, color) {
        let adfNode = { "type": "text", "text": text };

        // Applying strikethrough mark if needed
        if (isStrikethrough) {
            adfNode.marks = [{ "type": "strike" }];
        }

        // Applying color mark if needed
        if (color) {
            adfNode.marks = adfNode.marks || [];
            adfNode.marks.push({ "type": "textColor", "attrs": { "color": color }});
        }

        return adfNode;
    }

    getDiffTextToADF(item) {
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
        // Construct the final HTML string using a Confluence 'expand' macro to display the differences
        return this.generateDiffADF(oldText, newText);
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


module.exports = AdfBuilder;

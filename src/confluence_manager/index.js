const Logger = require('../logger');
const logger = Logger.getInstance();
const HtmlBuilder = require('../html_builder');
const {JSDOM} = require("jsdom");
const axios = require('axios');
const {dirname} = require("path");
const fs = require("fs").promises;
class ConfluenceManager {
    constructor(localEnv) {
        this.localEnv = localEnv;
        this.htmlBuilder = new HtmlBuilder(this.localEnv);
    }

    async getConfluencePages() {
        const pageTree = await this.fetchPageContent(this.localEnv.CONFLUENCE_CATALOG_PAGE_ID);
        if (pageTree) {
            try {
                // Extracting the directory path from the full file path
                const dirPath = dirname(this.localEnv.PATH_TO_CACHE_FILE);

                // Ensuring that the directory exists
                await fs.mkdir(dirPath, { recursive: true });

                // Saving the retrieved data in a JSON file
                await fs.writeFile(this.localEnv.PATH_TO_CACHE_FILE, JSON.stringify(pageTree, null, 2));
                logger.info(`Data for all pages saved in cache.${this.localEnv.ENV_NAME}.json`);
                return pageTree;
            } catch (error) {
                logger.error(`Error writing cache file: ${error}`);
                process.exit(1);
            }
        } else {
            logger.error('Failed to retrieve page data.');
            process.exit(1);
        }
    }

    /**
     * Function for obtaining the content of a Confluence page.
     * It uses recursion to extract data from child pages.
     * @param {string} pageId - ID of the Confluence page.
     * @param {number} attempt - Current attempt of the request (used for retrying in case of errors).
     * @returns {Promise<Object|null>} - A promise returning the page data object or null in case of an error.
     */
    async fetchPageContent(pageId, attempt = 1) {
        const versionCache = this.getVersionOfCache(this.localEnv.oldGlobalCache, pageId);
        let versionPage = 0;
        const newChildrenPage = [];

        try {
            // request for child pages and document version
            const response = await axios.get(`${this.localEnv.CONFLUENCE_BASE_URL}/${pageId}?expand=children.page,version`, {
                headers: {
                    'Authorization': `Basic ${this.localEnv.AUTH}` // Header for authentication
                }
            });

            // Checking for the presence of a Retry-After header in the response and waiting if necessary
            if (response.headers['retry-after']) {
                const retryAfter = parseInt(response.headers['retry-after']);
                if (!isNaN(retryAfter)) {
                    logger.info(`Waiting ${retryAfter} ms before the next request...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter));
                }
            }

            versionPage = response.data.version.number;

            // Recursive retrieval of child page IDs
            if (response.data.children.page.results.length > 0) {
                for (const child of response.data.children.page.results) {
                    newChildrenPage.push(child.id);
                }
            }


        } catch (error) {
            // Error handling for the request
            if (error.response && attempt < 3) {
                // Retry the request in case of an error (up to 3 attempts)
                const retryAfter = error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after']) : 120000; // Default delay is 2 minutes
                logger.info(`Err 1 - Error ${error.response.status}: Retrying in ${retryAfter / 1000} seconds (Attempt ${attempt + 1} of 3)...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                return this.fetchPageContent(pageId, attempt + 1);
            } else {
                logger.error(`Error #1003 retrieving page ${pageId}:`, error.message);
                return null; // Return null in case of failure
            }
        }

        if (versionPage === versionCache) { // if the version from the page is the same as from the cache, then data will be taken from the cache

            logger.info(`from Cache: ${pageId}`);

            const pageOfCache = this.getPageOfCache(this.localEnv.oldGlobalCache, pageId);
            // Creating an object with page data from the cache + children from the request
            const pageData = {
                id: pageId,
                title: pageOfCache.title,
                content: pageOfCache.content,
                content_text: pageOfCache.content_text,
                version: pageOfCache.version,
                children_ID: newChildrenPage,
                updated: false,
                children: []
            };

            // Recursive extraction of data from the cache
            if (pageData.children_ID.length > 0) {
                for (const childId of pageData.children_ID) {
                    const childData = await this.fetchPageContent(childId);
                    pageData.children.push(childData);
                }
            }

            return pageData; // Return a data of page
        }

        try {
            // Sending a GET request to the Confluence API with necessary headers
            const response = await axios.get(`${this.localEnv.CONFLUENCE_BASE_URL}/${pageId}?expand=body.storage,children.page,version`, {
                headers: {
                    'Authorization': `Basic ${this.localEnv.AUTH}` // Header for authentication
                }
            });

            // Checking for the presence of a Retry-After header in the response and waiting if necessary
            if (response.headers['retry-after']) {
                const retryAfter = parseInt(response.headers['retry-after']);
                if (!isNaN(retryAfter)) {
                    logger.info(`Waiting ${retryAfter} ms before the next request...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter));
                }
            }

            logger.info(`from Confluence: ${pageId}`);

            // Creating an object with page data from the API response
            const pageData = {
                id: pageId,
                title: response.data.title.replace('&', 'and'),
                content: this.deleteComments(response.data.body.storage.value),
                content_text: this.htmlToText(response.data.body.storage.value),
                version: response.data.version.number,
                children_ID: [],
                updated: true,
                children: []
            };

            // Recursive extraction of child page data
            if (response.data.children.page.results.length > 0) {
                for (const child of response.data.children.page.results) {
                    pageData.children_ID.push(child.id);
                    const childData = await this.fetchPageContent(child.id);
                    pageData.children.push(childData);
                }
            }

            return pageData; // Returning the page data
        } catch (error) {
            // Error handling during the request
            if (error.response && attempt < 3) {
                // Retry the request in case of an error (up to 3 attempts)
                const retryAfter = error.response.headers['retry-after'] ? parseInt(error.response.headers['retry-after']) : 120000; // Default delay is 2 minutes
                logger.info(`Error ${error.response.status}: Retrying in ${retryAfter / 1000} seconds (Attempt ${attempt + 1} of 3)...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter));
                return this.fetchPageContent(pageId, attempt + 1);
            } else {
                logger.error(`Error #1004 retrieving page ${pageId}:  ${error.message}`);
                return null; // Return null in case of failure
            }
        }
    }

    /**
     * Searches and retrieves the document version from the cache, or zero if no document is found.
     * @param cache - the tree of pages
     * @param pageId - ID of the page being searched for
     * @returns {number|*}
     */
    getVersionOfCache(cache, pageId) {
        if (cache && cache.id === pageId) {
            return cache.version;
        }

        if (cache && cache.children) {
            for (const child of cache.children) {
                const result = this.getVersionOfCache(child, pageId);
                if (result !== 0) return result;
            }
        }

        return 0;
    }

    /**
     * delete comments
     * @param html
     * @returns {*}
     */
    deleteComments(html) {
        // Удаление всех открывающих тегов, начинающихся на <ac:
        html = html.replace(/<ac:inline-comment-marker[^>]*>/g, '');
        // Удаление всех закрывающих тегов, начинающихся на </ac:
        html = html.replace(/<\/ac:inline-comment-marker>/g, '');
        return html;
    }

    /**
     * Converts HTML to text, processing paragraphs and tables.
     * Paragraphs are converted to text with a newline at the end.
     * Tables are converted to a markdown-like format.
     * @param {string} html - The HTML string to be converted.
     * @returns {string} Converted text.
     */
    htmlToText(html) {
        // Initialize DOM based on the input HTML string
        const dom = new JSDOM(html);
        let document = dom.window.document;

        /**
         * Processes and modifies anchor elements (<a>) in a document.
         * If an anchor's text looks like a URL or if there's no text, it gets replaced with a placeholder text.
         * Otherwise, adds a prefix to the existing link text.
         * @param {Document} document - The document object in which to process links.
         */
        function removeLinks(document) {
            const links = document.querySelectorAll('a');
            links.forEach(link => {
                // Extracting the text content of the link and trimming any whitespace
                const linkText = link.textContent.trim();

                // Checking if the link text looks like a URL
                const isLinkTextUrl = /^(https?:\/\/|www\.)/i.test(linkText);

                if (!linkText || isLinkTextUrl) {
                    // If the text is empty or looks like a URL, replace it with "Link removed"
                    link.textContent = '(Link removed)';
                } else {
                    // If the link contains text and it doesn't look like a URL, add a prefix to it
                    link.textContent = `link(${linkText})`;
                }
            });
        }

        /**
         * Replace <del></del> tags
         * @param document
         */
        function processDelTags(document) {
            const delElements = document.querySelectorAll('del');
            delElements.forEach(del => {
                const text = del.textContent;
                // Замена элемента <del> на текст с заданной конструкцией
                del.outerHTML = `{{del}}${text}{{/del}}`;
            });
        }

        /**
         * Converts an HTML table to a markdown-like text format.
         * @param {HTMLTableElement} table - The HTML table element to be converted.
         * @returns {string} Table in a markdown-like text format.
         */
        function tableToMarkdown(table) {
            let md = "\n\nMarkdown table:\n";
            const rows = table.querySelectorAll("tr");

            // Process each row of the table
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.querySelectorAll("th, td");
                let rowText = i === 0 ? "Headers: " : "Row: " + i + " ";
                // Process each cell in the row
                cells.forEach(cell => {
                    rowText += `| ${cell.textContent.trim()} `;
                });
                md += rowText + "|\n";

                // Add a separator after the table headers
                if (i === 0) {
                    md += "|" + "---|".repeat(cells.length) + "\n";
                }
            }
            return md;
        }

        function convertTablesToMarkdown(document) {
            const tables = document.querySelectorAll("table");
            tables.forEach(table => {
                const markdown = tableToMarkdown(table);
                const newParagraph = document.createElement("p");
                newParagraph.textContent = markdown;
                table.parentNode.replaceChild(newParagraph, table);
            });
        }

        function decodeHtml(html) {
            return html
                .replace(/&nbsp;/g, ' ')
                .replace(/&/g, 'and')
                .replace(/</g, '(')
                .replace(/>/g, ')');
        }
        // delete all links
        removeLinks(document);
        // replace DEL tags
        processDelTags(document);
        // Extract text from HTML
        let text = "";
        // Process each table and convert it to markdown-like text
        convertTablesToMarkdown(document);
        // Process each paragraph with a newline added
        document.querySelectorAll("p").forEach(p => {
            text += p.textContent.trim() + "\n";
        });
        return decodeHtml(text);
    }

    /**
     * Searches and retrieves a document from the cache, or null if no document is found.
     * @param cache - the tree of pages
     * @param pageId - ID of the page being searched for
     * @returns {*|null} - the page or null
     */
    getPageOfCache(cache, pageId) {
        if (cache.id === pageId) {
            return cache;
        }

        if (cache.children) {
            for (const child of cache.children) {
                const result = this.getPageOfCache(child, pageId);
                if (result) return result;
            }
        }
        return null;
    }


    /**
     * Updates the page with the RTM table
     * @returns {Promise<void>}
     */
    updateRTMPage = async () => {
        if (this.localEnv.ENABLE_UPDATE_RTM) {
            let htmlBody;
            try {
                htmlBody = this.htmlBuilder.htmlRTMBuilder();
            } catch (error) {
                console.log("htmlRTMBuilder - crashed!" , error , error.stackTrace); // todo: replace it later
                process.exit(0);
            }
            try {

                await this.mainUpdatePage(htmlBody, this.localEnv.CONFLUENCE_RTM_PAGE_ID);
                this.localEnv.forSlackReport.rtm.status = true; // todo: need create variable ???
            } catch (error) {
                this.localEnv.forSlackReport.rtm.status = false;
                logger.error(`Error #1008 ${this.localEnv.forSlackReport.rtm.message} ${error}`);
            }
        } else {
            logger.info(`Updating RTM - Requirements Traceability Matrix page is disabled.`);
        }
    }

    /**
     * Updates the statistics page
     * @returns {Promise<void>}
     */
     updateStatisticPage = async () => {
        if (this.localEnv.ENABLE_UPDATE_STAT) {
            try {
                const htmlBody = await this.htmlBuilder.htmlStatisticBuilder();
                await this.mainUpdatePage(htmlBody, this.localEnv.CONFLUENCE_STATISTIC_PAGE_ID);
                this.localEnv.forSlackReport.rtm_statistics.status = true;
            } catch (error) {
                this.localEnv.forSlackReport.rtm_statistics.status = false;
                logger.error(`Error #1007 ${this.localEnv.forSlackReport.rtm_statistics.message} ${error}`);
            }
        } else {
            logger.info(`Updating RTM - Statistics page is disabled.`);
        }
    }


    /**
     * General method for updating any page
     * @param htmlBody - code sent to the page
     * @param page_id - ID of the page for the update
     * @returns {Promise<void>}
     */
    async mainUpdatePage(htmlBody, page_id) {
        let titlePage = '';
        /**
         * Before updating, you need to get the page version number
         * if there is a delay header, set a timeout until the next request
         * @returns {Promise<*|null>}
         */
        const getCurrentPageVersion = async () => {
            try {
                const response = await axios.get(`${this.localEnv.CONFLUENCE_BASE_URL}/${page_id}?expand=version`, {
                    headers: {'Authorization': `Basic ${this.localEnv.AUTH}`}
                });
                titlePage = response.data.title;

                // Check for the presence of a Retry-After header in the response and wait if required
                if (response.headers['retry-after']) {
                    const retryAfter = parseInt(response.headers['retry-after']);
                    if (!isNaN(retryAfter)) {
                        logger.info(`Waiting ${retryAfter} ms before the next request...`);
                        await new Promise(resolve => setTimeout(resolve, retryAfter));
                    }
                }

                return response.data.version.number;
            } catch (error) {
                logger.error(`Error #1009 in retrieving the page version:\n\n${error}`);
                return null;
            }
        }

        /**
         * Function for updating the page - generates and executes a request
         * @param newVersion - new version number (+1)
         * @param newContent - content body - ready HTML code
         * @returns {Promise<void>}
         */
        const updatePage = async (newVersion, newContent) => {
            try {
                const data = {
                    id: page_id,
                    type: 'page',
                    title: titlePage,
                    version: {
                        number: newVersion
                    },
                    body: {
                        storage: {
                            value: newContent,
                            representation: 'storage'
                        }
                    }
                };

                await axios.put(`${this.localEnv.CONFLUENCE_BASE_URL}/${page_id}`, data, {
                    headers: {
                        'Authorization': `Basic ${this.localEnv.AUTH}`,
                        'Content-Type': 'application/json'
                    }
                });
                logger.info(`Page ${titlePage} "${page_id}" updated successfully.`);  // response.data
            } catch (error) {
                logger.error(`Error #1010 updating page ${titlePage} "${page_id}":\n\n${error}`);
            }
        }

        /**
         * Receives the version number from the page, passes the number+1 to update
         * @returns {Promise<void>}
         */
        async function update() {
            const currentVersion = await getCurrentPageVersion();
            if (currentVersion) {
                await updatePage(currentVersion + 1, htmlBody);
            }
        }

        await update();
    }
}



module.exports = ConfluenceManager

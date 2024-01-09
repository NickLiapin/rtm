/**
 * Return 'YES' or 'NO'
 * @param {boolean} value
 * @returns {string}
 */
function yesOrNo(value) {
    if (value) {
        return 'YES';
    }
    return 'NO';
}

/**
 * Converts a string value to a boolean.
 * The string is first converted to lowercase, then compared with the string 'true'.
 * @param {string} value - The string value to convert.
 * @returns {boolean} Returns `true` if the string value equals 'true' (case-insensitive), otherwise `false`.
 */
function toBoolean(value) {
    return value.toLowerCase() === 'true';
}

/**
 * Функция для создания задержки.
 * @param {number} ms - Время задержки в миллисекундах.
 * @returns {Promise<void>} Promise, который разрешается после заданного времени.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts the numeric part of a case string.
 * @param {string} caseString - The case string from which to extract the number.
 * @returns {string|null} The extracted number as a string, or null if not found.
 */
function extractCaseNumber(caseString) {
    // Using regular expression to extract the numeric part of the string
    const match = caseString.match(/\d+/);
    return match ? match[0] : null;
}

/**
 * EST date format
 * @param date
 * @returns {string}
 */
function formatDateEST(date) {
    const options = { timeZone: 'America/New_York', hour12: true, timeZoneName: 'short' };
    return date.toLocaleString('en-US', options);
}

/**
 * Formats the current date in YYYY-MM-DD format.
 * @returns {string} The formatted date string.
 */
function formatDate() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = date.getFullYear();

    return `${year}-${month}-${day}`;
}

/**
 * replace {{del}}Text{{/del}} to <del>Text</del>
 * @param text
 * @returns {*}
 */
function replaceDelTags(text) {
    // Заменяет все вхождения {{del}}Text{{/del}} на <del>Text</del>
    return text.replace(/{{del}}(.*?){{\/del}}/g, '<del>$1</del>');
}

/**
 * Recursively searches for a node by its ID in a nested structure.
 * If found, returns an object with the 'title' and 'content_text' of the node.
 * If the node is not found, returns null.
 * @param {Object} node - The current node or structure to search within.
 * @param {string} id - The ID of the node to search for.
 * @returns {{ title: string, content_text: string } | null} - Object with 'title' and 'content_text' if found, else null.
 */
function findNodeById(node, id) {
    // Check if the current node's ID matches the target ID
    if (node.id === id) {
        // Return the relevant information if the node is found
        return {title: node.title, content_text: node.content_text};
    }

    // If the current node has children, iterate through them
    if (node.children && node.children.length > 0) {
        for (let child of node.children) {
            // Recursively search in the current child
            const result = findNodeById(child, id);
            // If the node is found in a child, return the result
            if (result) return result;
        }
    }

    // Return null if the node is not found in the current branch
    return null;
}

module.exports = { yesOrNo,
    toBoolean,
    sleep,
    extractCaseNumber,
    formatDateEST,
    formatDate,
    replaceDelTags,
    findNodeById
};

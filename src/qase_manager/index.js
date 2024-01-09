const Logger = require('../logger');
const logger = Logger.getInstance();
const axios = require('axios');
const {sleep, extractCaseNumber} = require("../common_functions");


class QaseManager {

    constructor(QASE_CODE, QASE_TOKEN, QASE_MAX_REQUESTS_PER_MINUTE) {
        this.QASE_CODE = QASE_CODE;
        this.QASE_TOKEN = QASE_TOKEN;
        this.QASE_MAX_REQUESTS_PER_MINUTE = QASE_MAX_REQUESTS_PER_MINUTE;
    }

    /**
     * Проверяет, какие тест-кейсы из списка являются автоматизированными.
     * @param {number[]} testCaseIds - Массив ID тест-кейсов для проверки.
     * @returns {Promise<number[]>} Массив ID автоматизированных тест-кейсов.
     */
    async checkAutomatedTestCases(testCaseIds) {
        const automatedTestCases = []; // Массив для хранения ID автоматизированных тест-кейсов
        const delayBetweenRequests = 60000 / this.QASE_MAX_REQUESTS_PER_MINUTE; // Расчет задержки между запросами

        for (const testCaseId of testCaseIds) {
            const testCaseDetails = await this.getTestCaseDetails(testCaseId); // Получение деталей каждого тест-кейса
            if (testCaseDetails && testCaseDetails.result.automation > 1) {
                automatedTestCases.push(testCaseId); // Добавление ID тест-кейса в массив, если он автоматизирован
            }
            await sleep(delayBetweenRequests); // Задержка перед следующим запросом
        }

        return automatedTestCases; // Возвращаем массив автоматизированных тест-кейсов
    }

    /**
     * Получает детали тест-кейса по его ID.
     * @param {number} testCaseId - ID тест-кейса.
     * @returns {Promise<Object|null>} Объект данных тест-кейса или null, если произошла ошибка.
     */
    async getTestCaseDetails(testCaseId) {
        try {
            // Отправка GET-запроса к API qase.io для получения информации о тест-кейсе
            const response = await axios.get(`https://api.qase.io/v1/case/${this.QASE_CODE}/${testCaseId}`,
                {
                headers: { 'Token': this.QASE_TOKEN } // Установка API ключа в заголовке запроса
            });

            // Проверка наличия заголовка 'retry-after' и применение задержки
            if (response.headers['retry-after']) {
                const retryAfter = parseInt(response.headers['retry-after'], 10);
                await sleep(retryAfter * 1000); // Ожидание указанного количества секунд
            }
            logger.info(`QASE.IO > Test case with ID ${testCaseId} has been verified.`);
            return response.data; // Возвращаем данные ответа
        } catch (error) {
            // Обработка ошибки, если тест-кейс не найден или произошла другая ошибка
            if (error.response && error.response.status === 404) {
                logger.info(`QASE.IO > Test case with ID ${testCaseId} is not found or deleted.`);
            } else {
                logger.error(`QASE.IO > Error #1005 while retrieving test case data ${testCaseId}: `, error);
            }
            return null;
        }
    }

    /**
     * Adds items to a global array based on specific criteria.
     * @param {Array} inputArray - The array of objects to process.
     * @param {Array} automatedGlobalCases
     * @param {Array} needAutomateGlobalAC
     * @returns {number} The count of AC- items that are not fully automated.
     */
    getNeedAutomateAC(inputArray, automatedGlobalCases, needAutomateGlobalAC) {
        let countNotFullyAutomatedAC = 0;

        inputArray.forEach(item => {
            // Filtering content based on automation eligibility and case checks
            const filteredContent = item.content
                .filter(contentItem => {
                    if (contentItem.isAutomatable) {
                        // Include if no cases are present
                        if (contentItem.cases.length === 0) {
                            countNotFullyAutomatedAC++;
                            return true;
                        }
                        // Check if any case has not passed the check (not in checkedCases)
                        const hasUnverifiedCase = contentItem.cases.some(caseId => {
                            const caseNumber = extractCaseNumber(caseId);
                            return caseNumber && !automatedGlobalCases.includes(caseNumber);
                        });

                        // Include if any case has not passed the check
                        if (hasUnverifiedCase) {
                            countNotFullyAutomatedAC++;
                            return true;
                        }
                    }
                    // Exclude if not automatable or all cases are verified
                    return false;
                })
                .map(contentItem => contentItem.name);

            // Adding to global array if there are eligible items
            if (filteredContent.length > 0) {
                needAutomateGlobalAC.push({
                    id: item.id,
                    title: item.title,
                    content: filteredContent
                });
            }
        });

        return countNotFullyAutomatedAC;
    }
}


module.exports = QaseManager;

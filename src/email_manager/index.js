const Logger = require('../logger');
const nodemailer = require("nodemailer");
const logger = Logger.getInstance();
const HtmlEmailBuilder = require('../html_email_builder');


class EmailManager {

    constructor(localEnv) {
        this.localEnv = localEnv;
        this.htmlEmailBuilder = new HtmlEmailBuilder(this.localEnv);
    }

    async emailReport() {
        if(this.localEnv.ENABLE_EMAIL_REPORT) {
            try {
                const htmlBody = this.htmlEmailBuilder.htmlToMail();
                if(this.localEnv.forSlackReport.email.status) {
                    await this.sendMail(htmlBody);
                    logger.info('E-Mail report: sent!');
                } else {
                    logger.info("Email not sent - no updates!");
                }
            } catch (error) {
                this.localEnv.forSlackReport.email.status = false;
                logger.error(`Error #1015 ${this.localEnv.forSlackReport.email.message} ${error}`);
            }
        } else {
            logger.info(`E-Mail report - is disabled.`);
        }
    }

    async sendMail(htmlBody) {
        // Создание транспортера
        let transporter = nodemailer.createTransport({
            service: this.localEnv.EMAIL_SERVICE, // Пример с использованием Gmail
            auth: {
                user: this.localEnv.EMAIL_USER, // Ваш адрес электронной почты для отправки
                pass: this.localEnv.EMAIL_PASSWORD  // Ваш пароль от почты
            }
        });

        // Настройка параметров письма
        let mailOptions = {
            from: `'RTM report from the ${this.localEnv.ENV_NAME} project' <${this.localEnv.EMAIL_USER}>`,     // Отправитель (ваш адрес)
            to: this.localEnv.EMAIL_TO,       // Получатель
            subject: this.localEnv.EMAIL_SUBJECT,  // Тема письма
            html: htmlBody // HTML-содержимое отчета
        };

        // Отправка письма
        try {
            let info = await transporter.sendMail(mailOptions);
            // logger.info(`Email sent: successful.`);
        } catch (error) {
            logger.error(`Error #1016 sending email: ${error}\n\n${error.stackTrace}`);
        }
    }


}


module.exports = EmailManager;

# Program Configuration through .env File

## Introduction
This document describes the setup of a program that collects requirements, creates an RTM (Requirements Traceability Matrix) table, and gathers statistics for Confluence. The program settings are defined through the `.env` file.

## .env File Content
Your `.env` file should include the following parameters:

## Example .env
Ваш файл `.env` должен выглядеть следующим образом:

```
# Basic program settings

ENV_NAME=sandbox
CONFLUENCE_DOMAIN=keplerhealth.atlassian.net
CONFLUENCE_CATALOG_PAGE_ID=11111111
CONFLUENCE_RTM_PAGE_ID=22222222
CONFLUENCE_STATISTIC_PAGE_ID=33333333
CONFLUENCE_USERNAME=nikolay.lyapin@kepler.team
CONFLUENCE_TOKEN=QWERT12........................................3QWERTY123
CONFLUENCE_REG_EXP_AC=<strong[^>]*>(AC-[\d\.]+)\s?:?\s*<\/strong>(.*?)<\/p>|gi
CONFLUENCE_ABBR=KP
QASE_ABBR=TKP

CONFLUENCE_UPDATE_RTM=true
CONFLUENCE_UPDATE_STAT=true

# Jira configuration
ENABLE_JIRA_TASK=false
JIRA_DOMAIN=keplerhealth.atlassian.net
JIRA_USERNAME=nikolay.lyapin@kepler.team
JIRA_TOKEN=QWERT12........................................3QWERTY123

# E-mail configuration
ENABLE_EMAIL_REPORT=false
EMAIL_SERVICE=gmail
EMAIL_USER=keplerQA@gmail.com
EMAIL_PASSWORD=xxxxxxxxxxxxxxxxx
EMAIL_TO=user_1@gmail.com,user_2@gmail.com,user_3@gmail.com,user_4@gmail.com
EMAIL_SUBJECT="RTM updates"

# qase.io configuration
ENABLE_QASE=false
QASE_TOKEN=QWERTY........123QWErty
QASE_CODE=TKP
QASE_SECRET=QWERTY........12312312323434546

# Slack configuration
ENABLE_SLACK_REPORT=true
SLACK_BOT_TOKEN=qrwetwe.............qwe32
SLACK_CHANNEL_ID=XXX....XXXX
```

### Basic Program Settings
- `ENV_NAME`: Environment name (e.g., `sandbox`).
- `CONFLUENCE_DOMAIN`: Confluence domain.
- `CONFLUENCE_CATALOG_PAGE_ID`: ID of the catalog page in Confluence.
- `CONFLUENCE_RTM_PAGE_ID`: ID of the RTM page in Confluence.
- `CONFLUENCE_STATISTIC_PAGE_ID`: ID of the statistics page in Confluence.
- `CONFLUENCE_USERNAME`: Confluence username.
- `CONFLUENCE_TOKEN`: Confluence access token.
- `CONFLUENCE_REG_EXP_AC`: Regular expression for data processing.
- `CONFLUENCE_ABBR`: Abbreviation for Confluence.
- `QASE_ABBR`: Abbreviation for qase.io.
- `CONFLUENCE_UPDATE_RTM`: Enable RTM update (true/false).
- `CONFLUENCE_UPDATE_STAT`: Enable statistics update (true/false).

### Jira Configuration
- `ENABLE_JIRA_TASK`: Enable Jira tasks (true/false).
- `JIRA_DOMAIN`: Jira domain.
- `JIRA_USERNAME`: Jira username.
- `JIRA_TOKEN`: Jira access token.

### Email Configuration
- `ENABLE_EMAIL_REPORT`: Enable email report sending (true/false).
- `EMAIL_SERVICE`: Email service (e.g., `gmail`).
- `EMAIL_USER`: Email user.
- `EMAIL_PASSWORD`: Email password.
- `EMAIL_TO`: List of email recipients.
- `EMAIL_SUBJECT`: Email subject.

### qase.io Configuration
- `ENABLE_QASE`: Enable qase.io integration (true/false).
- `QASE_TOKEN`: qase.io access token.
- `QASE_CODE`: qase.io project code.
- `QASE_SECRET`: qase.io secret key.

### Slack Configuration
- `ENABLE_SLACK_REPORT`: Enable Slack report sending (true/false).
- `SLACK_BOT_TOKEN`: Slack bot token.
- `SLACK_CHANNEL_ID`: Slack channel ID.

## Obtaining Data for Settings

### Confluence
1. **Domain**: Use your organization's Confluence domain.
2. **Page IDs**: Find page IDs in the URL when viewing the respective page in Confluence.
3. **User and Token**: Create an API token in your Confluence profile settings.

## Generating a Token in Confluence

To generate an authentication token in Confluence, follow these steps:

1. Log in to your Confluence Cloud account.
2. Click on your account icon in the top right corner.
3. Go to the "Manage Account" page.
4. Navigate to the "Security" section of your account.
5. Find the "API tokens" section.
6. Click on the link "Create and manage API tokens".
7. Click "Create API token".
8. Enter a description for the token for easy identification (e.g., "Token for RTM integration").
9. Save the generated token. This token will need to be inserted into your .env file as the value for `TOKEN`.


### Jira
1. **Domain**: Use your organization's Jira domain.
2. **User and Token**: Create an API token in your Jira profile settings.

### Email
1. **Service**: Choose an appropriate email service (e.g., `gmail`).
2. **User and Password**: Use your email account credentials.

### qase.io
1. **Token**: Create an API token in your qase.io account settings.
2. **Project Code**: Specify your qase.io project code.

### Slack
1. **Bot Token**: Create a bot token in your Slack workspace settings.
2. **Channel ID**: Find the ID of the channel where the bot will send reports.

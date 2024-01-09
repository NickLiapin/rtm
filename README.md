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
PATH_TO_LOGS_DIRECTORY=../logs
PATH_TO_CACHE_DIRECTORY=../chache
PATH_TO_STATISTICS_DIRECTORY=../statistics
CONFLUENCE_DOMAIN=keplerhealth.atlassian.net
CONFLUENCE_CATALOG_PAGE_ID=11111111
CONFLUENCE_RTM_PAGE_ID=22222222
CONFLUENCE_STATISTIC_PAGE_ID=3333333
CONFLUENCE_USERNAME=nikolay.lyapin@kepler.team
CONFLUENCE_TOKEN=ATATT................................................35BE
REG_EXP_AC=<strong[^>]*>(AC-[\d\.]+)\s?:?\s*<\/strong>(.*?)<\/p>|gi
REG_EXP_CASES=\[((?!NA).+?)\]|gi

# [A_] or [N_]
REG_EXP_AUTOMATION_STATUS=\[NA\]

# true = "Need automate" / false = "Not automate"
SELECT_AUTOMATION_STATUS=true

SHOW_NEED_AUTOMATE_AC=true
CONFLUENCE_ABBR=KP
QASE_ABBR=TKP
CONFLUENCE_UPDATE_RTM=true
CONFLUENCE_UPDATE_STAT=true

# Jira configuration
ENABLE_JIRA_TASK=false
JIRA_DOMAIN=keplerhealth.atlassian.net
JIRA_USERNAME=nikolay.lyapin@kepler.team
JIRA_TOKEN=ATATT........................................................35BE
JIRA_PROJECT_KEY=KP
JIRA_COMPONENT_NAME=RTM

# E-mail configuration
ENABLE_EMAIL_REPORT=false
EMAIL_SERVICE=gmail
EMAIL_USER=john.smith.wuw@gmail.com
EMAIL_PASSWORD="y...............................n"
EMAIL_TO=nikolay.lyapin@kepler.team
EMAIL_SUBJECT="Automatic RTM report"
EMAIL_IMG=https://lh3.googleusercontent.com/pw/ADCreHcA7qI3BCwDy8P7rmAj1v59lBPym0NjrMY7T2WVYk8dOmb_GTozVf_GaLlPE8Fw3i3Tj15LYKrm4KXclKe4yy-2NTWeLxICx_28EpLseUV_8vAQDdoaqjedfCYmFvvokHGZ2M7H2fOMqZBsRBClTgLD4I5Ls1AQ7fhQ3QctqhXtx3zjayooZ6waAG7i4vFBew-F0_r94DiZ_b-0wsVsZ8tS3xS8wB5Pla21whbpUo2wTU6nlmyxxWJVNbUPj0VlkgR8LK5K9Iz4Hf0sB4gG8nmI3S0nH81TW46Z7a1PS6A9Bgx613OAPCVYSTS1eXpFibpbVIPAVvF3EAC1XzV6gB-1AXuvjhqb4AFX9qrnoJ1iWz4jQQn5lvd9tVs6UFvoXRV-k60-p2StEeMx0sBj6PVulmtP88mjNfqrNzQTuff6LOzoBYAIHZzv9LPUDeAGsq6OEnwbqYj1tDNDNhN6OkEOyDv_Omyjuk0lqpWuHQ-d8dMvr64Zwi2qJjdRC_dk_zvGTiv3CkMi963SO6jy7tK8AJ70niKgohna3hnZQ5sXNV-hh2xdT9r4DRKIpzzpJtvpIX2k719QtdCqO3vsXF0i6-GKqoysp16wgtLAp3_eGs2k7WcHLB-dlYW9Ku7wErBLutSWNLHq0CT2hT8GMU-qBGZeDRwmLULj1xrHepbw2jzRJudKi8oIdbwN7djzD8h5-8wCSkouLO3o9vwqm5Mc8Jxi8Hqoj3AipJpxj4Rs0L4HNfyQUh4soQHsZNL5u2J0GR3_0_1y7Tqipt3-OHIDKOL8Y_ZGNR5ibkOpKrX9iktT8zy62A19EU-MA0eas9KvbsPIDAkv42rIv9HAy4_goBPDm3lIMuPivO36ElMjGtmAX67BQzikMoVaCVNKPrHD2suQrvDBy2ARz4CBlrAbviUkjXMQb66ngPw8F8EnytSFBaXwDvN9LKF_il-wxEVnjRnMEbzvaMzNK0n68iLhrs1RPg_Kn43ltILHi21hOcD6=w150-h150-s-no-gm?authuser=3

# Slack configuration
ENABLE_SLACK_REPORT=true
SLACK_BOT_TOKEN=xo....................................RP
SLACK_CHANNEL_ID=C............0

# qase.io configuration
ENABLE_QASE=true
QASE_TOKEN=8..................................b5
QASE_CODE=WUW
QASE_MAX_REQUESTS_PER_MINUTE=500
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

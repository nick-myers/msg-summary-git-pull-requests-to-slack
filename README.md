# Purpose

This script is used to retrieve open pull requests for an organisation from the github graphql api and post a summary of the information about them to a slack channel.

# Pre-requisites

1. You will need a Personal Access Token from github
2. You will need to [create an application for Slack](https://api.slack.com/apps), and get the OAuth token for the application (with at least the `chat:write:user` scope)

# Installation and usage

1. Install node.js - https://nodejs.org/
2. Use the node package manager (npm) to install the following packages: 
  * `npm install typescript`
  * `npm install @types/node`
  * `npm install @octokit/graphql`
  * `npm install moment`
  * `npm install moment-business-days`
  * `npm install @slack/web-api`
3. Clone this repository to a directory of your choosing
4. Initialise typescript in the directory you cloned the repo into
  * `npm run tsc -- --init`
5. Create `/src/config.ts` and populate it as described below

# Configuration

The content of the `/src/config.ts` should be as follows:

```javascript
export const gitUrl: string = 'https://www.github.com/api'; // Enterprise users should replace this with their own URL
export const pass: string = 'QUSV065T5P88NTQ9XHMA6CA184CPX2EUM4OR0BYF'; // Github personal access token - this is not a real token
export const oauthToken: string = 'xoxp-28841330430-452313974416-300102328521-k8eniubfprdxjp3m4fv65z7j1oc57lfy'; // Slack application oauth token - will start with xoxp- this is not a real token
export const channel: string = 'OJQY8BFJJ'; // Slack channel ID - this is not a real channel id
export const organisation: string = 'MyOrganisation'; // Github organisation name 
```

# Transpile

1. Run `tsc` 

# Execute

1. Run `node ./build/g2s.js`

# Scheduling

On Windows 10 I used the built in [Task Scheduler](https://en.wikipedia.org/wiki/Windows_Task_Scheduler) application, that would trigger the node application and pass the path to the javascript file as an argument.

1. In the task schedule, I added an action that called the program: `C:\nodejs\node.exe`
2. I added the argument with the full path to the javascript file `C:\Users\nick.myers\Documents\GitHub\g2s\build\g2s.js`

# Example output (as a slack message)

*repository-1* has *2* open pull request(s):  
• 2 days old: _Feature/APP-1234 Makes changes_ - https://www.github.com/organisation/repository-1/pull/25  
• 6 days old: _Feature/APP-1236 Makes changes to the secondary api…_ - https://www.github.com/organisation/repository-1/pull/24  

*repository-2* has *1* open pull request(s):  
• 11 days old: _APP-1235 added tags_ - https://www.github.com/organisation/repository-2/pull/60  

*repository-3* has *2* open pull request(s):  
• 6 days old: _APP-1236: Updates node.js version to the latest version of 10 supported b…_ - https://www.github.com/organisation/repository-3/pull/75  
• 11 days old: _APP-1237 Added tags to the change set, this will add tags to all objec…_ - https://www.github.com/organisation/repository-3/pull/72  
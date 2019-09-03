/*****************
 * 
 * This script will retrieve open pull request information for an organisation from the github API and post a summary of the data to a Slack channel
 * https://github.com/nick-myers/msg-git-pull-requests-to-slack
 * 
 * npm install --save-dev typescript
 * npm run tsc -- --init
 * npm install --save-dev @types/node
 * npm install --save-dev @octokit/graphql
 * npm install --save-dev moment
 * npm install --save-dev moment-business-days
 * npm install --save-dev @slack/web-api
 * 
 */

import { gitUrl, pass, oauthToken, channel, organisation } from './config';
const moment = require('moment-business-days');
let { graphql } = require("@octokit/graphql");
const { WebClient } = require('@slack/web-api');
const web = new WebClient(oauthToken);
const graphqlQuery = {
    query: `query { organization(login: "${organisation}") {
              repositories(first: 20, orderBy: {field: PUSHED_AT, direction: DESC}) {
              nodes {
                  name
                  url
                  pullRequests(first: 10, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
                      nodes {
                          headRepository { 
                              nameWithOwner
                              url
                            }
                          url
                          author {
                          ... on User {
                              login name
                              }
                          }
                          mergeable
                          createdAt
                          baseRefName
                          headRefName
                          title
                          ... on PullRequest {
                              pullRequestcommits: commits(last: 1) {
                                  totalCount
                                  nodes {
                                      commit {
                                          url
                                          status { state contexts { context description createdAt targetUrl } }
                                      }
                                  }
                              }
                          }
                      }
                  }
              }
          }
        }
      }`}
graphql = graphql.defaults({
    baseUrl: gitUrl,
    headers: {
      authorization: `token ${pass}`
    }
});

async function slack(message: string) {
    await web.chat.postMessage({
        channel: channel,
        text: message
    });
}
async function query() {
    try {
        const result = await graphql(graphqlQuery);
        const nodes = result.organization.repositories.nodes;
        let text: string = '';
        nodes.forEach(async(node: any)  =>  {
            const prCount = node.pullRequests.nodes.length;
            if (prCount !== 0) {
                text = `*${node.name}* has *${prCount}* open pull request(s):\n`;
                const pullRequests = node.pullRequests.nodes;
                let details: string = '';
                pullRequests.forEach(async(pullRequestNode: any) => {
                    const nowDate = new Date();
                    const createdDate = new Date(pullRequestNode.createdAt);
                    const numWorkingDays = moment(createdDate).businessDiff(moment(nowDate));
                    details = details + `>${numWorkingDays} days old: _${pullRequestNode.title}_ - ${pullRequestNode.url}\n`;
                })
                slack(text.concat(details));
            }
        });
    } catch (error) {
        console.log('Request failed:', error.request);
        console.log(error.message);
    }
}
query();
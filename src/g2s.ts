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
 * npm install ps-node
 * 
 */

import { gitUrl, pass, oauthToken, channel, organisation, vpnhost, vpnuser, vpnpass, vpnexe } from './config';
const ps = require('ps-node');
const moment = require('moment-business-days');
let { graphql } = require("@octokit/graphql");
const { WebClient } = require('@slack/web-api');
const vpn = require('cisco-vpn')({
    server: vpnhost,
    username: vpnuser,
    password: vpnpass,
    exe: vpnexe
})
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
async function sleep(ms: number){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}
async function slack(message: string) {
    await web.chat.postMessage({
        channel: channel,
        text: message
    });
}
async function query() {
    try {
        console.log(`Waiting 15 seconds before attempting to query to allow VPN connection to complete`);
        await sleep(15000)
        const result = await graphql(graphqlQuery);
        const nodes = result.organization.repositories.nodes;
        let text: string = '';
        let prExists = false;
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
                prExists = true;
                slack(text.concat(details));
            };
        });
        if(prExists === false) {
            const message = `Look, it's not you, it's me.  This has never happened before to me.  I've searched all the repositories and cannot find any open pull requests`;
            slack(message);
        }
    } catch (error) {
        console.log('Request failed:', error.request);
        console.log(error.message);
    }
}
async function killvpnuiclient() {
    await ps.lookup({
        command: 'vpnui'
    }, async function(err: any, resultList: any ) {
    if (err) {
        throw new Error( err );
    }

    await resultList.forEach(async function( process: any ){
        if( process ){
            console.log('Killing: PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments);
            await ps.kill( process.pid, 'SIGKILL', function( err: any ) {
                if (err) {
                    throw new Error( err );
                }
                else {
                    console.log( 'Process %s has been killed without a clean-up!', process.pid );
                }
            });
            }
        });
    });
}
async function vpnconnect() {
    try {
        await vpn.connect().then(() => console.log('Connected to VPN!'));
    } catch (error) {
        console.log(error);
    }
};

async function run() {
    const killed = await killvpnuiclient();
    if (killed != undefined) {
        console.log(`Could not validate VPN client has been killed. It may not be running.`)
    } else if (killed == undefined) {
        console.log(`Looks like the VPN client is not running.`)
    }
    await vpnconnect();
    await query();
}

run();

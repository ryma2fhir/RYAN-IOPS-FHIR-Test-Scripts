import {Reporter, TestContext} from '@jest/reporters';
import { AggregatedResult } from '@jest/test-result';
import fs from "fs";
import {NEW_LINE} from "../src/common.js";

type CustomReporter = Pick<Reporter, "onRunComplete">;

export default class TestReporter implements CustomReporter {
    constructor() {}

    onRunComplete(_: Set<TestContext>, results: AggregatedResult) {
        let gitHubSummary = NEW_LINE + NEW_LINE+'### :fire: Report '+NEW_LINE;
        let gitrepoBranch = process.env.GITHUB_REF_NAME
        const gitrepoName = process.env.GITHUB_REPOSITORY
        if (gitrepoBranch != null) {
            gitHubSummary += ' Branch '+ gitrepoBranch+' '+NEW_LINE;
        } else {
            gitrepoBranch = 'main';
        }
        if (gitrepoName != null) {
            gitHubSummary += ' Name '+ gitrepoName+' '+NEW_LINE+NEW_LINE;
        }
        gitHubSummary += ' :x: Failed '+ results.numFailedTests+' '+NEW_LINE;
        gitHubSummary += ' :white_check_mark: Passed '+ results.numPassedTests+' '+NEW_LINE;
        gitHubSummary += NEW_LINE+NEW_LINE;
        for(let parent of results.testResults) {
            let lastGroupName='';
            for (let status of ['issues','summary']) {
                if (status == 'issues') gitHubSummary += '### Issues'+NEW_LINE+NEW_LINE;
                if (status == 'issues') gitHubSummary += '### Summary'+NEW_LINE+NEW_LINE;
                for (let result of parent.testResults) {
                    if ((status == 'issues' && result.status == 'failed') ||
                        (status == 'summary') ) {
                        let group = result.fullName.split(result.title)
                        if (lastGroupName == '' || (group.length > 0 && lastGroupName != group[0])) {
                            lastGroupName = group[0]
                            if (lastGroupName.includes('.') && gitrepoBranch != undefined) {
                                let destination = process.env.PACKAGE_REPO
                                if (destination != undefined) {
                                    gitHubSummary += '[' + (lastGroupName.replace(" ", "/")).trim() + '](' + ('https://github.com/NHSDigital/' + destination + '/blob/main/' + lastGroupName.replace(" ", "/")).trim() + ') ' + NEW_LINE;
                                } else {
                                    gitHubSummary += '[' + (lastGroupName.replace(" ", "/")).trim() + '](' + ('../../blob/' + gitrepoBranch + '/' + lastGroupName.replace(" ", "/")).trim() + ') ' + NEW_LINE;
                                }
                            } else {
                                gitHubSummary += '#### ' + lastGroupName + ' ' + NEW_LINE;
                            }
                        }
                        if (result.status == 'passed') gitHubSummary += ' * :white_check_mark:'
                        if (result.status == 'failed') gitHubSummary += ' * :x:'
                        gitHubSummary += " " + result.title + NEW_LINE;
                        if (status =='issues') {
                            // Only list errors for issues section
                            for (let error of result.failureMessages) {
                                // Remove the stack, does not mean anything to modellers
                                var pattern = 'at ';
                                error = error.split(NEW_LINE).filter(function (str) { return !(str.trim().startsWith(pattern)); })
                                 .join(NEW_LINE + ' > ');
                                gitHubSummary += NEW_LINE + ' > ' + error + NEW_LINE + NEW_LINE
                            }
                        }
                    }
                }
            }
        }

        const gitSummaryFile = process.env.GITHUB_STEP_SUMMARY
        console.log('GitSummary Text = '+gitHubSummary)
        if (fs.existsSync(gitSummaryFile)) {
            console.log('Git Summary found :' + gitSummaryFile)
            try {
                fs.appendFileSync(gitSummaryFile, gitHubSummary);
            } catch (e) {
                console.log('Error processing '+ gitSummaryFile + ' Error message '+ (e as Error).message)
            }
        } else {
            console.log('Git Summary not found :' + gitSummaryFile)
        }
    }
}

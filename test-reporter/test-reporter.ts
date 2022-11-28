import {Reporter, TestContext} from '@jest/reporters';
import { AggregatedResult } from '@jest/test-result';
import fs from "fs";

type CustomReporter = Pick<Reporter, "onRunComplete">;

export default class TestReporter implements CustomReporter {
    constructor() {}

    onRunComplete(_: Set<TestContext>, results: AggregatedResult) {
        let gitHubSummary = '/n/n### :fire: Report /n';
        gitHubSummary += ' :heart_on_fire: Failed '+ results.numFailedTests+' /n';
        gitHubSummary += ' :green_heart: Passed '+ results.numPassedTests+' /n';

        for(let parent of results.testResults) {
            for(let result of parent.testResults) {

               // console.log(result)
                // result.title + '/n - ' +
                gitHubSummary +=  result.fullName
                if (result.status == 'passed') gitHubSummary += ':heavy_check_mark:'
                if (result.status == 'failed') gitHubSummary += ':x:'
                gitHubSummary += ' /n';
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

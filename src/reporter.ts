import {Reporter, TestContext} from '@jest/reporters';
import { AggregatedResult } from '@jest/test-result';

// Our reporter implements only the onRunComplete lifecycle
// function, run after all tests have completed
export default class CustomReporter implements Pick<Reporter, 'onRunComplete'> {
    onRunComplete(testContexts: Set<TestContext>, results: AggregatedResult): Promise<void> | void {
        console.log('Completed !!! in my test reporter')
        return undefined;
    }
}

import {
    getFhirClientJSON, isIgnoreFile, isIgnoreFolder, NEW_LINE, testFile
} from "./common.js";
import * as fs from "fs";
import {describe, expect, jest} from "@jest/globals";
import axios, {AxiosInstance} from "axios";
import * as console from "console";

// Initial terminology queries can take a long time to process - cached responses are much more responsive
jest.setTimeout(40*1000)


let gitHubSummary = '### :fire_engine: Logs '+NEW_LINE;

const args = require('minimist')(process.argv.slice(2))
    //const args = process.argv

    let source = '../'
    let examples: string

    function readStrictValidation() {
    try {
        // Read the content of the JSON file
        const data = fs.readFileSync('options.json', 'utf8');

        // Parse the JSON content
        const options = JSON.parse(data);

        // Access the attribute value or default to true if not found
        const strictValidation = options['strict-validation'] === undefined ? true : JSON.parse(options['strict-validation']);

        // Print the value
        console.log('Strict Validation:', strictValidation);

        // Return the attribute value
        return strictValidation;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File not found
            console.error('Error: File not found, defaulting to true');
        } else if (error instanceof SyntaxError) {
            // JSON parsing error (attribute not found)
            console.error('Error: Attribute not found in the JSON file, defaulting to true');
        } else {
            // Other errors
            console.error('Error:', error);
        }

        // Return true as the default value
        return true;
        }
    }
	
	const failOnWarning = readStrictValidation();

    gitHubSummary += 'Strict validation: ' + failOnWarning + NEW_LINE;

    if (args!= undefined) {
        if (args['source']!= undefined) {
            source = args['source'];

        }
        if (args['examples']!= undefined) {
            examples = args['folder'];
            source = '../'
        }
    }

    try {
        const resource: any = fs.readFileSync(source + '/package.json', 'utf8')
        if (resource != undefined) {
            let pkg = JSON.parse(resource)
            if (pkg.name.startsWith('fhir.r4.ukcore') || pkg.name.startsWith('UKCore')) {
                gitHubSummary += 'Detected UKCore ' + NEW_LINE;
            }
            if (pkg.dependencies != undefined) {
                for (let key in pkg.dependencies) {
                    if (key.startsWith('fhir.r4.ukcore')) {
                        gitHubSummary += 'ukcore dependency found' + NEW_LINE
                    }
                }
            }
        }
    } catch (e) {
        gitHubSummary += 'No package.json found' + NEW_LINE;
    }

    describe('Test Environment', ()=> {
        let client: AxiosInstance;
        beforeAll(async () => {
            client = await getFhirClientJSON();
        });
        test('Validator is functioning ', async function () {

            const result = await client.get('/metadata')
            expect(result.status).toEqual(200)

        })
    });

    gitHubSummary += 'Current directory - ' + __dirname

    // Main body of the tests
    testFolder(source, source)


    // Experiment to writeback additional information
    const gitSummaryFile = process.env.GITHUB_STEP_SUMMARY
    console.info('GitSummary Text = '+gitHubSummary)
    if (fs.existsSync(gitSummaryFile)) {
        console.info('Git Summary found : ' + gitSummaryFile)
        try {
            fs.appendFileSync(gitSummaryFile, gitHubSummary);
        } catch (e) {
            console.info('Error processing '+ gitSummaryFile + ' Error message '+ (e as Error).message)
        }
    } else {
        console.info('Git Summary not found : ' + gitSummaryFile)
    }

    function testDescription(folder: string) : string {
        return folder.split('/').pop()
    }

    function testFolder(dir : string, source: string) {

        if (fs.existsSync(dir)) {
            if (dir == source ) {
                testFolderContent(dir,source)
            } else {
                describe(testDescription(dir), () => {
                    testFolderContent(dir, source)
                });
            }
        }
    }


function testFolderContent(dir : string, source: string) {
        console.info('Test folder: '+dir)
        const list = fs.readdirSync(dir);
        list.forEach(function (file) {
            if (fs.lstatSync(dir +'/'+file).isDirectory()) {
                if (!isIgnoreFolder(file)) testFolder(dir+ "/" + file, source)

            } else {
                if (!isIgnoreFile(dir,file)) {
                    testFile( dir, file, failOnWarning)
                }
            }
        })
    }











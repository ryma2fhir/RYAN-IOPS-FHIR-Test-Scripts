import {defaultBaseUrl, getJson, resourceChecks} from "./common.js";

import * as fs from "fs";
import supertest from "supertest"
import {describe, expect, jest} from "@jest/globals";
import {StructureDefinition} from "fhir/r4";
import axios from "axios";


const args = require('minimist')(process.argv.slice(2))
    //const args = process.argv

    let source = '../'
    let examples: string

    let failOnWarning = false;

    if (args!= undefined) {
        if (args['source']!= undefined) {
            source = args['source'];

        }
        if (args['examples']!= undefined) {
            examples = args['folder'];
            source = '../'
        }
    }


    const client = () => {
        return supertest(defaultBaseUrl)
    }
axios.create({
    baseURL: defaultBaseUrl,
    headers: {'Accept': 'application/fhir+json'}
});
const resource: any = fs.readFileSync(source + '/package.json', 'utf8')
    if (resource != undefined) {
        let pkg= JSON.parse(resource)

        if (pkg.dependencies != undefined) {
            for (let key in pkg.dependencies) {
                if (key.startsWith('fhir.r4.ukcore')) {
                    failOnWarning = true;
                    console.log('ukcore dependency found, enabled STRICT validation')
                }
            }
        }
    }

    describe('Test Environment', ()=> {
        test('Validator is functioning ', async function () {
            await client().get('/metadata').expect(200)
        })
    });

    console.log('Current directory - ' + __dirname)
    testFolderAll(source )



function testFolderAll(dir) {

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);
        list.forEach(function (fileTop) {
            if (fs.lstatSync(source+fileTop).isDirectory()) {

                describe(fileTop,() => {
                    const list = fs.readdirSync(dir + fileTop);
                    let runTest = true
                    if (fileTop.startsWith('.')) runTest = false;
                    if (fileTop == 'Diagrams') runTest = false;
                    if (fileTop == 'Diagams') runTest = false;
                    if (fileTop == 'FML') runTest = false;
                    if (fileTop == 'dist') runTest = false;
                    if (fileTop == 'documents') runTest = false;
                    if (fileTop == 'nhsdtheme') runTest = false;
                    if (fileTop == 'ukcore') runTest = false;
                    if (fileTop == 'apim') runTest = false;
                    if (fileTop == 'Supporting Information') runTest = false;
                    // This project needs to avoid these folders
                    if (fileTop == 'validation') runTest = false;
                    if (fileTop == 'validation-service-fhir-r4') runTest = false;
                    if (runTest) {
                        list.forEach(function (file) {
                            let processFile = true
                            if (file.includes('.DS_Store')) processFile = false;
                            if (file.startsWith('.')) processFile = false;
                            if (processFile) {
                                testFile(dir, fileTop, file)
                            }
                        })
                    }
                })
            }
        });
    }
}

function testFile(dir, fileTop, file)
{
    describe(file, () => {
            file = dir + fileTop + "/" + file;
            let resource: any = undefined
            try {
                resource = fs.readFileSync(file, 'utf8');
            } catch (e) {
                console.log('Error reading ' + file + ' Error message ' + (e as Error).message)
            }
            // Initial terminology queries can take a long time to process - cached responses are much more responsive
            jest.setTimeout(40000)

            let fhirResource = getJson(file, resource)
            let validate = true
            try {
                let json = JSON.parse(fhirResource)
                if (json.resourceType == "StructureDefinition") {
                    if (json.kind == "logical") {
                        // skip for now
                        validate = false
                    }
                    let structureDefinition: StructureDefinition = json
                    test('Check snapshot is not present', () => {
                        expect(structureDefinition.snapshot).toBeFalsy()
                    })
                }
            } catch (e) {
                console.log('Error processing ' + file + ' exception ' + (e as Error).message)
                validate = false
            }

            if (validate) {
                var fileExtension = file.split('.').pop();
                if (fileExtension == 'xml' || fileExtension == 'XML') {

                        test('FHIR Validate XML', async () =>{
                            await validateXML(resource);
//  if (operationOutcomeResponse != undefined) console.log((operationOutcomeResponse.body as OperationOutcome).issue.length)
                        })

                } else {

                        test('FHIR Validate JSON', async () =>{
                            await validateJSON(fhirResource);
//  if (operationOutcomeResponse != undefined) console.log((operationOutcomeResponse.body as OperationOutcome).issue.length)
                        })


                }
            }
        }
    )
}

async function validateXML(resource): Promise<void> {

    return client()
        .post('/$validate')
        .retry(3)
        .set("Content-Type", 'application/fhir+xml')
        .set("Accept", 'application/fhir+json')
        .send(resource)
        .then((response: any) => {
                resourceChecks(response, failOnWarning)
            },
            error => {

                if (!error.message.includes('Async callback was not invoked within the')) throw new Error(error.message)
            }
        )
}
async function validateJSON(fhirResource): Promise<any> {

    await client()
        .post('/$validate')
        .retry(3)
        .set("Content-Type", 'application/fhir+json')
        .set("Accept", 'application/fhir+json')
        .send(fhirResource)
        .expect(200)
        .then((response: any) => {
                resourceChecks(response, failOnWarning)
            },
            error => {

                if (!error.message.includes('Async callback was not invoked within the')) throw new Error(error.message)
            }
        )

}



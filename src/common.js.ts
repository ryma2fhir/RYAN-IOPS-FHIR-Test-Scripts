import axios, {AxiosInstance} from "axios";
import {MessageDefinition, OperationOutcome, OperationOutcomeIssue, StructureDefinition} from "fhir/r4";
import fs from "fs";
import path from "path";

// This is only used for converting between XML and Json. Potentially replace with a service
var Fhir = require('fhir').Fhir;

export let defaultBaseUrl = 'http://localhost:9001/FHIR/R4';
//export let defaultBaseUrl = 'http://lb-fhir-validator-924628614.eu-west-2.elb.amazonaws.com/FHIR/R4';

// See also https://github.com/awslabs/fhir-works-on-aws-deployment/blob/mainline/integration-tests/utils.ts
export const getFhirClientJSON = async () => {
    return axios.create({
        headers: {
            'Content-Type': 'application/fhir+json',
            'Accept': 'application/fhir+json'
        },
        baseURL : defaultBaseUrl
    });
};

export const getFhirClientXML = async () => {
    return axios.create({
        headers: {
            'Content-Type': 'application/fhir+xml',
            'Accept': 'application/fhir+json'
        },
        baseURL : defaultBaseUrl
    });
};

export function resourceChecks(response: any, failOnWarning:boolean) {

    const resource: any = response.data;
    expect(resource.resourceType).toEqual('OperationOutcome');
    errorsCheck(resource, failOnWarning)
}

export function resourceCheckErrorMessage(response: any, message: string, failOnWarning:boolean) {

    const resource: any = response.data;
    expect(resource.resourceType).toEqual('OperationOutcome');
    expect(hasErrorMessage(resource)).toEqual(true)
    if (message != undefined) expect(errorMessageCheck(resource,message, failOnWarning))
}

export function resourceCheckWarningMessage(response: any, message: string) {

    const resource: any = response.data;
    expect(resource.resourceType).toEqual('OperationOutcome');
    expect(hasWarningMessage(resource)).toEqual(true)
    if (message != undefined) expect(warningMessageCheck(resource,message))
}


export async function getPatient(): Promise<any> {
    return await fs.readFileSync('Examples/pass/patient.json', 'utf8');
}

export async function getResource(file: string): Promise<any> {
    return await fs.readFileSync(file, 'utf8');
}


export function getJson(file, resource) {
    try {
        var fileExtension = file.split('.').pop();
        if (fileExtension == 'xml' || fileExtension == 'XML') {


            var fhir = new Fhir();
            var json = fhir.xmlToJson(resource);
            if (JSON.parse(json).resourceType == undefined) throw Error('Invalid JSON Missing resource type ' + file)

            return json;
        } else {
            // console.log(file);
            if (JSON.parse(resource).resourceType == undefined) throw Error('Invalid JSON Missing resource type ' + file)
            if (JSON.parse(resource).resourceType == "Parameters") {
                var jsonResource = {
                    "resourceType": "Parameters",
                    "parameter": [
                        {
                            "name": "resource",
                            "resource": JSON.parse(resource)
                        }
                    ]
                };
                return JSON.stringify(jsonResource);
            }
            return resource;
        }
    }
    catch (e) {
        console.log('Error processing '+file + ' Error message '+ (e as Error).message)
        return undefined
    }

}

export async function downloadPackage(destinationPath, name,version ) {
    const url = 'https://packages.simplifier.net/' + name + '/' + version;
    console.log('Download from ' + url);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        // @ts-ignore
        const buffer = Buffer.from(response.data, 'binary');

        fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
        fs.writeFileSync(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), buffer);
        console.log('Updated dependency ' + url);
    } catch (exception) {
        process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
        throw new Error('Unable to download package '+url);
    }
}

function hasErrorMessage(resource): boolean  {
    const operationOutcome: OperationOutcome = resource;
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {
            switch (issue.severity) {
                case "error":
                case "fatal":
                    return true;
            }
        }
    }
    // if (warn>5) console.log("Warnings "+warn);
    return false;
}

function hasWarningMessage(resource): boolean  {
    const operationOutcome: OperationOutcome = resource;
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {
            switch (issue.severity) {
                case "warning":
                    return true;
            }
        }
    }
    return false;
}

function errorMessageCheck(resource, message, failOnWarning:boolean) :boolean {
    const operationOutcome: OperationOutcome = resource;
    let errorMessage = 'None found';
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {

            switch (issue.severity) {
                case "error":
                case "fatal":
                    errorMessage = getErrorOrWarningFull(issue);
                    if (errorMessage.includes(message)) return true;
                    break;
                case "warning":
                    if (raiseWarning(issue, failOnWarning)) throw new Error(getErrorOrWarningFull(issue))
                    break;
            }
        }
    }
    throw new Error('Expected: ' + message + ' Found: '+errorMessage)
}

function warningMessageCheck(resource, message) :boolean {
    const operationOutcome: OperationOutcome = resource;
    let errorMessage = 'None found';
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {

            switch (issue.severity) {
                case "warning":
                    errorMessage = getErrorOrWarningFull(issue);
                    if (errorMessage.includes(message)) return true;
            }
        }
    }
    throw new Error('Expected: ' + message + ' Found: '+errorMessage)
}

function errorsCheck(operationOutcome : OperationOutcome, failOnWarning:boolean) {
    let issues : String[] = []
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {
            let str = issueCheck(issue, failOnWarning)
            if (str != undefined) issues.push(str + '\n')
        }
    }
    if (issues.length >0) {
        throw new Error(issues.toString())
    }
}
function issueCheck(issue: OperationOutcomeIssue, failOnWarning:boolean) : string  {
    switch (issue.severity) {
        case "error":
        case "fatal":
            if (raiseError(issue)) return "WARNING "+ getErrorOrWarningFull(issue)
            break;
        case "warning":
            if (raiseWarning(issue, failOnWarning)) return "WARNING "+ getErrorOrWarningFull(issue)
            break;
    }
    return undefined
}

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}
function getErrorOrWarningFull(issue: OperationOutcomeIssue) {
    let error = issue.diagnostics;
    if (issue.location != undefined) {
        for(let location of issue.location) {
            error += ' [ Location - ' + location + ']'
        }
    }
    return error;
}
function raiseWarning(issue: OperationOutcomeIssue, failOnWarning:boolean): boolean {
    if (issue != undefined && issue.diagnostics != undefined) {
        if (issue.diagnostics.includes('incorrect type for element')) {
            return true;
        }
        if (issue.diagnostics.includes('Error HTTP 401')) {
            return true;
        }
        if (issue.diagnostics.includes('Could not confirm that the codes provided are in the value set')) {
            if (issue.diagnostics.includes('http://hl7.org/fhir/ValueSet/usage-context-type')) return false;
        }
        if (issue.diagnostics.includes('Error HTTP 404')) {
            // THis is issues with the Terminology Server not containig UKCore and NHSDigita CocdeSystems
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/Workflow-Code')) return false;
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/NHSDataModelAndDictionary-treatment-function')) return false;
        }
        if (issue.diagnostics.includes("None of the codings provided are in the value set 'IdentifierType'")) {
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/organisation-role')) return false;
        }
        if (issue.diagnostics.includes('LOINC is not indexed!')) return false;
        if (issue.diagnostics.includes('Code system https://dmd.nhs.uk/ could not be resolved.')) return false

        if (issue.diagnostics.includes('http://snomed.info/sct')) {
            if (issue.diagnostics.includes('https://fhir.hl7.org.uk/ValueSet/UKCore-MedicationCode')) return false
            if (issue.diagnostics.includes('https://fhir.hl7.org.uk/ValueSet/UKCore-VaccineCode')) return false
        }
        if (issue.diagnostics.includes('None of the codings provided are in the value set')) {
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/NHSDigital-SDS-JobRoleCode')) return false
            if (issue.diagnostics.includes('http://snomed.info/sct')) {
                // Not defined in UKCore and valueset is extensible
                return !issue.diagnostics.includes('http://hl7.org/fhir/ValueSet/observation-methods');

            }
        }
        if (issue.diagnostics.includes('must be of the format')) {
            return true;
        }
    }

    // TODO this needs to be turned to true 1/8/2022 Warnings not acceptable on NHS Digital resources

    return failOnWarning;
}
function raiseError(issue: OperationOutcomeIssue) : boolean {
    if (issue != undefined && issue.diagnostics != undefined) {

        // List of errors to ignore
        if (issue.diagnostics.includes('could not be resolved, so has not been checked')) return false;
        // fault with current 5.5.1 validation
        if ( issue.diagnostics.includes('http://hl7.org/fhir/ValueSet/units-of-time')) return false;
        if ( issue.diagnostics.includes('NHSNumberVerificationStatus')) return false;
        if ( issue.diagnostics.includes('Validation failed for \'http://example.org/fhir')) return false;
        if ( issue.diagnostics.includes('Unrecognised property \'@fhir_comments')) return false;
        if (issue.diagnostics.includes('Code system https://dmd.nhs.uk/ could not be resolved.')) return false
        if (issue.diagnostics.includes('http://read.info/ctv3')) {
            if (issue.diagnostics.includes('https://fhir.hl7.org.uk/ValueSet/UKCore-ConditionCode')) return false
        }
       // if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/NHSDigital-SDS-JobRoleCode')) return false;
        if (issue.diagnostics.includes('java.net.SocketTimeoutException')) {
            console.log(issue.diagnostics)
            return false
        }
    }
    return true;
}

export function testFileError(testDescription, file,message) {
    describe(file, () => {
        const resource: any = fs.readFileSync(file, 'utf8');
        let client: AxiosInstance;
        beforeAll(async () => {
            var fileExtension = file.split('.').pop();
            if (fileExtension == 'xml' || fileExtension == 'XML') {
                client = await getFhirClientXML();
            } else {
                client = await getFhirClientJSON();
            }
        });
        test(testDescription, async () => {
            expect(resource).toBeDefined()
            const response = await client.post('/$validate', resource).catch(function (error) {
                return error.response
            })
            expect(response.status === 200 || response.status === 400).toBeTruthy()
            resourceCheckErrorMessage(response,message, true)
        })
    });
}

export function testFileErrorProfile(testDescription, file,message, profile) {
    describe(file, () => {
        const resource: any = fs.readFileSync(file, 'utf8');
        let client: AxiosInstance;
        beforeAll(async () => {
            var fileExtension = file.split('.').pop();
            if (fileExtension == 'xml' || fileExtension == 'XML') {
                client = await getFhirClientXML();
            } else {
                client = await getFhirClientJSON();
            }
        });
        test(testDescription, async () => {
            expect(resource).toBeDefined()
            const response = await client.post('/$validate?profile='+profile, resource).catch(function (error) {
                return error.response
            })
            expect(response.status === 200 || response.status === 400).toBeTruthy()
            resourceCheckErrorMessage(response,message, true)
            expect(response.status).toEqual(200)
        })
    });
}


export function testFileWarning(testDescription, file,message) {
    describe(file, () => {
        const resource: any = fs.readFileSync(file, 'utf8');
        let client: AxiosInstance;
        beforeAll(async () => {
            var fileExtension = file.split('.').pop();
            if (fileExtension == 'xml' || fileExtension == 'XML') {
                client = await getFhirClientXML();
            } else {
                client = await getFhirClientJSON();
            }
        });
        test(testDescription, async () => {
            expect(resource).toBeDefined()
            const response = await client.post('/$validate', resource)
            expect(response.status === 200 || response.status === 400).toBeTruthy()
            resourceCheckWarningMessage(response,message)
            expect(response.status).toEqual(200)
        })
    });
}


export function testFileValidator(testDescription,file) {

    describe(file, () => {
        const resource: any = fs.readFileSync(file, 'utf8');
        let client: AxiosInstance;
        beforeAll(async () => {
            var fileExtension = file.split('.').pop();
            if (fileExtension == 'xml' || fileExtension == 'XML') {
                client = await getFhirClientXML();
            } else {
                client = await getFhirClientJSON();
            }
        });
        test(testDescription, async () => {
            expect(resource).toBeDefined()
            const response = await client.post('/$validate', resource).catch(function (error) {
                return error.response
            })
            expect(response.status === 200 || response.status === 400).toBeTruthy()
            resourceChecks(response, true)
            expect(response.status).toEqual(200)
        })
    });
}

export function testFile(dir, fileTop, fileName, failOnWarning)
{
    let client: AxiosInstance;
    let file = dir + fileTop + "/" + fileName;
    let resource: any = undefined
    let json = undefined
    try {
        resource = fs.readFileSync(file, 'utf8');
        json = JSON.parse(getJson(file, resource))
    } catch (e) {
        console.log('Error reading ' + file + ' Error message ' + (e as Error).message)
    }
    let validate = true

    describe(fileName, () => {

            beforeAll(async () => {
                if (json.resourceType == "StructureDefinition") {
                    if (json.kind == "logical") {
                        // skip for now
                        validate = false
                    }
                }
                var fileExtension = file.split('.').pop();
                if (fileExtension == 'xml' || fileExtension == 'XML') {
                    client = await getFhirClientXML();
                } else {
                    client = await getFhirClientJSON();
                }
            });

            test('Profile and Resource checks', () => {
                expect(resource).toBeDefined()
                if (json.resourceType == "StructureDefinition") {
                    let structureDefinition: StructureDefinition = json
                    expect(structureDefinition.snapshot).toBeFalsy()
                }

            })
            test('FHIR Message checks', () => {

                if (json.resourceType == "MessageDefinition") {
                    let messageDefinition: MessageDefinition = json
                    for (let focus  of messageDefinition.focus) {
                        // Having a messageHeader be the focus of a MessageHeader makes no sense - potential loop
                        expect(focus.code !== 'MessageHeader').toBeTruthy()
                    }
                }
            })
            if (validate) {
                test('FHIR Validation', async () => {
                    expect(resource).toBeDefined()
                    const response = await client.post('/$validate', resource).catch(function (error) {
                        return error.response
                    })
                    expect(response.status === 200 || response.status === 400).toBeTruthy()
                    resourceChecks(response, failOnWarning)
                    expect(response.status).toEqual(200)
                });
            }
        }
    )
}



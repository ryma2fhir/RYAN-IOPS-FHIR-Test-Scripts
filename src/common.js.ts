import axios, {AxiosInstance} from "axios";
import {
    Bundle, CapabilityStatement,
    MessageDefinition,
    OperationOutcome,
    OperationOutcomeIssue, SearchParameter,
    StructureDefinition
} from "fhir/r4";
import fs from "fs";
import path from "path";
import * as console from "console";
import SwaggerParser from "@apidevtools/swagger-parser";
import buildBySources from "@jridgewell/trace-mapping/dist/types/by-source";

// This is only used for converting between XML and Json. Potentially replace with a service
var Fhir = require('fhir').Fhir;

export const NEW_LINE = '\n';

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

export const getFhirClientOAS = async () => {
    return axios.create({
        headers: {
            'Content-Type': 'text/vnd.yaml',
            'Accept': 'application/json'
        },
        baseURL : 'http://localhost:9001'
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

export function resourceChecks(response: any, failOnWarning:boolean)  {

    const resource: any = response.data;
    expect(resource.resourceType).toEqual('OperationOutcome');
    const errorMessage = getErrors(resource, failOnWarning)
    expect(errorMessage).toBeFalsy()
}

export function resourceCheckErrorMessage(response: any, message: string, failOnWarning:boolean) {

    const resource: any = response.data;
    expect(resource.resourceType).toEqual('OperationOutcome');

    expect(hasErrorMessage(resource)).toEqual(true)
    if (message != undefined) {
        const error = getErrors(resource,failOnWarning)
        expect(error).toContain(message)
    }
}

export function resourceCheckWarningMessage(response: any, message: string) {

    const resource: any = response.data;
    expect(resource.resourceType).toEqual('OperationOutcome');
    expect(hasWarningMessage(resource)).toEqual(true)
    if (message != undefined) expect(checkForWarningMessage(resource,message))
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
        //console.error('Error processing '+file + ' Error message '+ (e as Error).message)
        return undefined
    }

}

export async function downloadPackage(destinationPath, name,version ) {
    const url = 'https://packages.simplifier.net/' + name + '/' + version;
    console.info('Download from ' + url);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        // @ts-ignore
        const buffer = Buffer.from(response.data, 'binary');

        fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
        fs.writeFileSync(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), buffer);
        console.info('Updated dependency ' + url);
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
/*
function checkForErrorMessage(resource, message, failOnWarning:boolean) : string {
    const operationOutcome: OperationOutcome = resource;
    let errorMessage : string[]= [];
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {

            switch (issue.severity) {
                case "error":
                case "fatal":
                    errorMessage.pu getErrorOrWarningFull(issue);
                    if (errorMessage.includes(message)) errorMessage += errorMessage;
                    break;
                case "warning":
                    if (raiseWarning(issue, failOnWarning)) throw new Error(getErrorOrWarningFull(issue))
                    break;
            }
        }
    }
    return errorMessage;
    //throw new Error('Expected: ' + message + ' Found: '+errorMessage)
}
*/
function checkForWarningMessage(resource, message) :boolean {
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

function getErrors(operationOutcome : OperationOutcome, failOnWarning:boolean): string {
    let issues : String[] = []
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {
            let str = issueCheck(issue, failOnWarning)
            if (str != undefined) issues.push(str )
        }
    }
    if (issues.length >0) {
        return issues.join(NEW_LINE)
    }
    return undefined;
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
        /*
        if (issue.diagnostics.includes('Error HTTP 404')) {
            // THis is issues with the Terminology Server not containig UKCore and NHSDigita CocdeSystems
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/Workflow-Code')) return false;
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/NHSDataModelAndDictionary-treatment-function')) return false;
        }
         */
        if (issue.diagnostics.includes("None of the codings provided are in the value set 'IdentifierType'")) {
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/organisation-role')) return false;
        }
        if (issue.diagnostics.includes('LOINC is not indexed!')) return false;
        if (issue.diagnostics.includes('Code system https://dmd.nhs.uk/ could not be resolved.')) return false
/*
        if (issue.diagnostics.includes('http://snomed.info/sct')) {
            if (issue.diagnostics.includes('https://fhir.hl7.org.uk/ValueSet/UKCore-MedicationCode')) return false
            if (issue.diagnostics.includes('https://fhir.hl7.org.uk/ValueSet/UKCore-VaccineCode')) return false
        }
*/
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
            console.error(issue.diagnostics)
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

export function isIgnoreFolder(folderName : string) : boolean {

    if (folderName.startsWith('.')) return true;
    if (folderName == 'node_modules') return true;
    if (folderName == 'Diagrams') return true;
    if (folderName == 'Diagams') return true;
    if (folderName == 'FML') return true;
    if (folderName == 'dist') return true;
    if (folderName == 'documents') return true;
    if (folderName == 'nhsdtheme') return true;
    if (folderName == 'ukcore') return true;
    if (folderName == 'UKCore') return true;
    if (folderName == 'apim') return true;
    if (folderName == 'Supporting Information') return true;
    // This project needs to avoid these folders
    if (folderName == 'validation') return true;
    if (folderName == 'validation-service-fhir-r4') return true;
    // For BARS
    if (folderName == 'guides') return true;
    return false;
}

export function isIgnoreFile(directory : string, fileName : string) : boolean {
    var fileExtension = fileName.split('.').pop().toUpperCase();
    let file = directory +'/'+ fileName
    if (fileName == 'fhirpkg.lock.json') return true;
    if (fileName == 'package.json') return true;
    if (fileExtension == 'JSON' || fileExtension == 'XML') {
        let json = undefined
        if (directory.indexOf('FHIR') > 0) return false;
        try {
            json = JSON.parse(getJson(file, fs.readFileSync(file, 'utf8')))
            if (json.resourceType != undefined) return false;
            else {
                console.info('File ignored : ' + file)
            }
        } catch (e) {
            console.info('Ignoring file ' + file + ' Error message ' + (e as Error).message)
        }
    } return true;
}

export function isDefinition(fileNameOriginal : string) : boolean {
   // console.info(fileNameOriginal);
    let fileName = fileNameOriginal.toUpperCase();

    if (fileName.startsWith('CapabilityStatement'.toUpperCase())) return true;
    if (fileName.startsWith('ConceptMap'.toUpperCase())) return true;
    if (fileName.startsWith('CodeSystem'.toUpperCase())) return true;
    if (fileName.startsWith('MessageDefinition'.toUpperCase())) return true;
    if (fileName.startsWith('NamingSystem'.toUpperCase())) return true;
    if (fileName.startsWith('ObservationDefinition'.toUpperCase())) return true;
    if (fileName.startsWith('OperationDefinition'.toUpperCase())) return true;
    if (fileName.startsWith('Questionnaire'.toUpperCase())) return true;
    if (fileName.startsWith('SearchParameter'.toUpperCase())) return true;
    if (fileName.startsWith('StructureDefinition'.toUpperCase())) return true;
    if (fileName.startsWith('ValueSet'.toUpperCase())) return true;
    if (fileName.startsWith('StructureMap'.toUpperCase())) return true;

    return false;
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

export function processYAMLfile(dir,file) {
    console.info('Yaml: ' + file)
    let input = undefined
    try {
        input = fs.readFileSync(dir + '/' + file, 'utf8');
      //  console.info(input)
    } catch (e) {
        throw new Error('Error with ' + file + ' Error message ' + (e as Error).message)
    }

    let resourceMap = new Map<string, string>()


    SwaggerParser.parse(dir + '/' + file).then(api => {

        let json: any = api
        if (json != undefined && json.paths != undefined) {
            let paths = json.paths
            for (const key in paths) {
                if (paths.hasOwnProperty(key)) {
                    let operation = paths[key]
                    for (const keyOp in operation) {
                        if (operation.hasOwnProperty(keyOp)) {
                            resourceMap = processOperation(key+'-'+keyOp,operation[keyOp], resourceMap)
                        }
                    }
                }
            }
        }
        for (let [key, value] of resourceMap) {
            fs.writeFile(path.join(dir, '/' + key + '.json'), JSON.stringify(value), function (err) {
                if (err) {
                    return console.error(err);
                }
            });
        }
        console.info('SWAGGER END')
    });
}

function processOperation (key,operation, resourceMap :Map<string, string>):Map<string, string> {

    let name = key.split('/').join('-')
    name = name.split('{').join('-')
    name = name.split('}').join('-')
    if (name.startsWith('-')) name=name.replace('-','')
    for (const keyOp in operation){
        console.info(keyOp)
        if(operation.hasOwnProperty(keyOp)){
            if (keyOp =='requestBody') processRequestBody(name + '-'+ keyOp ,operation[keyOp],resourceMap)
            if (keyOp =='responses') processRespones(name +'-'+ keyOp,operation[keyOp],resourceMap)
        }
    }
    return resourceMap
}

function processContent (name, operation, resourceMap :Map<string, string>):Map<string, string> {
    for (const keyOp in operation){
        if(operation.hasOwnProperty(keyOp)){
            if (keyOp == 'application/fhir+json') processFHIR(name, operation[keyOp],resourceMap)
        }
    }
    return resourceMap
}

function processFHIR (name,operation, resourceMap :Map<string, string>) :Map<string, string>{
    for (const keyOp in operation){
        if(operation.hasOwnProperty(keyOp)){
            if (keyOp == 'example') {
               // console.log(JSON.stringify(operation[keyOp]))
                resourceMap.set(name + '-' + resourceMap.size,operation[keyOp])
            }
            if (keyOp == 'examples') processExamples(name, operation[keyOp],resourceMap)
        }
    }
    return resourceMap
}

function processExamples (name, operation, resourceMap :Map<string, string>) :Map<string, string> {
    for (const keyOp in operation){
        if(operation.hasOwnProperty(keyOp)){
            if (keyOp == 'example')
            {
               // console.log(JSON.stringify(operation[keyOp].value))
                resourceMap.set(name + '-' + resourceMap.size,operation[keyOp].value)
            }
        }
    }
    return resourceMap
}
function processRespones (name, operation, resourceMap :Map<string, string>) :Map<string, string>{
    for (const keyOp in operation){
        if(operation.hasOwnProperty(keyOp)){
            processResponse(name, operation[keyOp],resourceMap)
        }
    }
    return resourceMap
}
function processResponse (name, operation, resourceMap :Map<string, string>):Map<string, string> {
    for (const keyOp in operation){
        if(operation.hasOwnProperty(keyOp)){
            if (keyOp =='content') processContent(name, operation[keyOp],resourceMap)
        }
    }
    return resourceMap
}
function processRequestBody (name, operation, resourceMap :Map<string, string>):Map<string, string> {
    for (const keyOp in operation){
        if(operation.hasOwnProperty(keyOp)){

            if (keyOp =='content') processContent(name, operation[keyOp],resourceMap)
        }
    }
    return resourceMap
}

function ignoreSearchParameter(name: string) {
    if (name == '_count') return true;
    return false;
}


export function testFile( folderName: string, fileName: string, failOnWarning :boolean, isUKore: boolean)
{
    let client: AxiosInstance;
    let file = folderName + "/" + fileName;
    let resource: any = undefined
    let json = undefined
    try {
        resource = fs.readFileSync(file, 'utf8');
        json = JSON.parse(getJson(file, resource))
    } catch (e) {
        throw new Error('Error with ' + file + ' Error message ' + (e as Error).message)
    }

    describe(fileName, () => {

            beforeAll(async () => {

                var fileExtension = file.split('.').pop();
                if (fileExtension == 'xml' || fileExtension == 'XML') {
                    client = await getFhirClientXML();
                } else {
                    client = await getFhirClientJSON();
                }
            });
            test('Check profiles are not present in resource (Implementation Guide Best Practice)', () => {
                if (json.meta != undefined) {
                    expect(json.meta.profile == undefined).toBeTruthy()
                }
                if (json.resourceType === 'Bundle') {
                    let bundle : Bundle = json
                    if (bundle.entry != undefined) {
                        for (let entry of bundle.entry) {
                            if (entry.resource !== undefined && entry.resource.meta != undefined) {
                                expect(entry.resource.meta.profile == undefined).toBeTruthy()
                            }
                        }
                    }
                }
            })
            test('Profile has no snapshot and Resource is present', () => {
                expect(resource).toBeDefined()

                if (json.resourceType == "StructureDefinition") {
                    let structureDefinition: StructureDefinition = json
                    expect(structureDefinition.snapshot).toBeFalsy()
                }
            })

            if (json.resourceType == "MessageDefinition") {
                test('FHIR Message - check MessageDefinition.focus does not contain MessageHeader or other Definitions', () => {
                    let messageDefinition: MessageDefinition = json
                    for (let focus of messageDefinition.focus) {
                        // Having a messageHeader be the focus of a MessageHeader makes no sense - potential loop
                        expect(focus.code !== 'MessageHeader').toBeTruthy()
                        expect(focus.code.endsWith('Definition')).toBeFalsy()
                    }

                })
            }
            if (json.resourceType == "CapabilityStatement") {
                describe('FHIR CapabilityStatement', () => {
                    let capabilityStatement: CapabilityStatement = json
                    if (capabilityStatement != undefined
                        && capabilityStatement.rest != undefined
                        && capabilityStatement.rest.length > 0
                        && capabilityStatement.rest[0].resource != undefined) {
                        for (let resource of capabilityStatement.rest[0].resource) {
                            if (resource.searchParam != undefined && resource.searchParam.length > 0) {
                                describe(resource.type + ' Search Parameter', () => {
                                    for (let searchParameter of resource.searchParam) {
                                        if (searchParameter.name != undefined) {
                                            let resourceName = resource.type
                                            if (!ignoreSearchParameter(searchParameter.name)) {
                                                describe(searchParameter.name, () => {
                                                    test('Verify SearchParameter', async () => {

                                                        const response = await client.get('/SearchParameter?code=' + searchParameter.name + '&base=' + resourceName).catch(function (error) {
                                                            return error.response
                                                        })
                                                        expect(response.status).toEqual(200)
                                                        expect(response.data).toBeDefined()
                                                        var resource = response.data
                                                        expect(resource.resourceType == 'Bundle').toBeTruthy()
                                                        var bundle: Bundle = resource
                                                        expect(bundle.entry).toBeDefined()
                                                        expect(bundle.entry.length > 0).toBeTruthy()
                                                        expect(bundle.entry[0].resource).toBeDefined()
                                                        expect(bundle.entry[0].resource.resourceType == 'SearchParameter').toBeTruthy()
                                                        var search : SearchParameter = bundle.entry[0].resource as SearchParameter
                                                        expect(search.type).toBeDefined()
                                                        expect(searchParameter.type).toBeDefined()
                                                        // TODO this needs group involvement before elaboration
                                                        //  expect(search.type == searchParameter.type).toBeTruthy()

                                                    })
                                                })
                                            }
                                        }
                                    }
                                })
                            }

                        }
                    }
                })
            }
            let validate = true
            if (json != undefined && json.resourceType == "StructureDefinition") {
                if (json.kind == "logical") {
                    // skip for now
                    validate = false
                }
            }
            if (validate) {
                if (!isUKore) {
                    test('FHIR Validation', async () => {
                        const response = await client.post('/$validate', resource).catch(function (error) {
                            return error.response
                        })
                        expect(response.status === 200 || response.status === 400).toBeTruthy()
                        resourceChecks(response, failOnWarning)
                        expect(response.status).toEqual(200)
                    });
                } else {

                    test('FHIR Validation - UKCore', async () => {
                        const response = await client.post('/$validate?profile=https://fhir.hl7.org.uk/StructureDefinition/UKCore-' + json.resourceType, resource).catch(function (error) {
                            return error.response
                        })
                        expect(response.status === 200 || response.status === 400).toBeTruthy()
                        resourceChecks(response, failOnWarning)
                        expect(response.status).toEqual(200)
                    })
                }

            }
        }
    )
}




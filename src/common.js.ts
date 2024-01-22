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
import {OpenAPI} from "openapi-types";
import Document = OpenAPI.Document;
import Parameter = OpenAPI.Parameter;


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


    const url = 'https://3cdzg7kbj4.execute-api.eu-west-2.amazonaws.com/poc/utility/FHIR/R4/ImplementationGuide/$package?url=https%3A%2F%2Ffhir.nhs.uk%2FImplementationGuide%2F' + name + '-' + version;
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
        downloadPackageSimplifier(destinationPath, name,version )
    }
}

export async function downloadPackageSimplifier(destinationPath, name,version ) {
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
            if (raiseError(issue)) return "ERROR "+ getErrorOrWarningFull(issue)
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
    
        //THESE WARNINGS SHOULD ALWAYS ERROR
        if (issue.diagnostics.includes('incorrect type for element')) {
            return true;
        }
        if (issue.diagnostics.includes('Error HTTP 401')) {
            return true;
        }
        
        // these warnings can always be silently ignored 
        //  i.e. known and not resolvable issues with dm+ and languages
        //if (issue.diagnostics.includes('Code system https://dmd.nhs.uk/ could not be resolved.')) return false
        if (issue.diagnostics.includes('Inappropriate CodeSystem URL') && issue.diagnostics.includes('for ValueSet: http://hl7.org/fhir/ValueSet/all-languages')) {
            return false
        }
                
        // LOINC Related warnings can be ignored
        if (issue.diagnostics.includes('http://loinc.org')) return false;
        if (issue.diagnostics.includes('LOINC is not indexed!')) return false;
        
        //DICOM warnings can be ignored
        if (issue.diagnostics.includes('ValueSet http://dicom.nema.org/')) return false;
        
        //Fragment codesystems can't be checked
        if (issue.diagnostics.includes('Unknown code in fragment CodeSystem')) {
            if (issue.diagnostics.includes('https://fhir.nhs.uk/CodeSystem/NHSDigital-SDS-JobRoleCode')) return false
        }
    }

    // COMMENT WAS: TODO this needs to be turned to true 1/8/2022 Warnings not acceptable on NHS Digital resources
    // Actual comment is: if error not handled above, return error if FailOnWarning is true 
    return failOnWarning;
}
function raiseError(issue: OperationOutcomeIssue) : boolean {
    if (issue != undefined) {
        if (issue.diagnostics != undefined) {
            // List of errors to ALWAYS ignore
            
            // languages, known issue!
            if (issue.diagnostics.includes('Inappropriate CodeSystem URL') && issue.diagnostics.includes('for ValueSet: http://hl7.org/fhir/ValueSet/all-languages')) {
                return false
            }
            
            // Ignore LOINC Errors for now
            if (issue.diagnostics.includes('http://loinc.org')) return false;
            
            // ignore dm+d / read errors
            //if (issue.diagnostics.includes('Code system https://dmd.nhs.uk/ could not be resolved.')) return false
            if (issue.diagnostics.includes('http://read.info/ctv3')) return false
            
        }
        if (issue.location !== undefined && issue.location.length>0) {
            if (issue.location[0].includes('StructureMap.group')) return false;
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
    if (folderName == 'diagrams') return true;
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

export function isIgnoreFile(directory: string, fileName: string): boolean {
    const fileExtension = fileName.split('.').pop().toUpperCase();
    const file = directory + '/' + fileName;

    // Read options.json file
    try {
        const optionsData = fs.readFileSync('options.json', 'utf8');
        const options = JSON.parse(optionsData);

        if (options['ignore-folders'] && Array.isArray(options['ignore-folders'])) {
            const ignoreFolders = options['ignore-folders'];

            // Check if fileName matches any ignore pattern
            if (ignoreFolders.includes(fileName) || ignoreFolders.includes(fileExtension)) {
                return true;
            }
        }
    } catch (e) {
        console.error('Error reading options.json file:', (e as Error).message);
    }

    // Rest of the logic for checking JSON and XML files
    if (fileExtension === 'JSON' || fileExtension === 'XML') {
        if (directory.indexOf('FHIR') > 0) {
            return false;
        }

        try {
            const json = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (json.resourceType !== undefined) {
                return false;
            } else {
                console.info('File ignored: ' + file);
            }
        } catch (e) {
            console.info('Ignoring file ' + file + ' Error message ' + (e as Error).message);
        }
    }

    return true;
}

export function isDefinition(fileNameOriginal: string): boolean {
    const validPrefixes = [
        'CapabilityStatement',
        'ConceptMap',
        'CodeSystem',
        'MessageDefinition',
        'NamingSystem',
        'ObservationDefinition',
        'OperationDefinition',
        'Questionnaire',
        'SearchParameter',
        'StructureDefinition',
        'ValueSet',
        'StructureMap'
    ];

    const fileName = fileNameOriginal.toUpperCase();
    return validPrefixes.some(prefix => fileName.startsWith(prefix.toUpperCase()));
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


    SwaggerParser.parse(dir + '/' + file)
        .catch((e)=> {

        })
        .then(api => {

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
        buildCapabilityStatement(dir,file,api)

    });
}

function processOperation (key,operation, resourceMap :Map<string, string>):Map<string, string> {

    let name = key.split('/').join('-')
    name = name.split('{').join('-')
    name = name.split('}').join('-')
    if (name.startsWith('-')) name=name.replace('-','')
    for (const keyOp in operation){

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

export function buildCapabilityStatement(dir: string, file, api: any | void) {


    if (api != undefined && api.paths != undefined) {
        let date = new Date().toISOString()
        let cs : CapabilityStatement = {
            fhirVersion: "4.0.1",
            resourceType: "CapabilityStatement",
            date : date,
            publisher: "IOPS Test Scripts",
            description: "Automatically generated from OAS file",
            format: [
                "application/fhir+json"
            ],
            kind: "requirements",
            status: "draft",
            rest: [
                {
                    mode:"server",
                    resource : []
                }
            ]
        };

        for (const path in api.paths) {

            let resource = path.replace(/\/+$/, '').split('/').pop()

            // Need to check this is a FHIR resource
            if (!resource.includes('{') && resource.match('^[A-Z].*'))  {
                let entry = {
                    type: resource,
                    profile: 'http://hl7.org/fhir/StructureDefinition/'+resource,
                    searchParam: []
                }

                if (api.paths.hasOwnProperty(path)) {
                    if (api.paths[path].get != undefined) {
                        let get = api.paths[path].get

                        if (get.parameters != null) {
                            for (const parameterId in get.parameters) {
                                let parameter: any = get.parameters[parameterId]
                                if (parameter.in != undefined && parameter.in == 'query') {
                                    // TODO need to get correct type, default to string
                                    entry.searchParam.push({
                                        name: parameter.name,
                                        type: 'string'

                                    })
                                }
                            }
                        }
                    }
                }
                // Only currently testing search parameters, so only add these
                if (entry.searchParam.length>0) {
                    cs.rest[0].resource.push(entry)
                }
            }
        }
        let name = file.split('.')[0]
        fs.writeFile(path.join(dir, '/' + name + '-generated.json'), JSON.stringify(cs), function (err) {
            if (err) {
                return console.error(err);
            }
        });

    }
}

export function testFile( folderName: string, fileName: string, failOnWarning :boolean)
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
                // Disable profile check for Parameters
                if (json.meta != undefined && json.resourceType !== 'Parameters') {
                    if (failOnWarning == true) {
                      expect(json.meta.profile == undefined).toBeTruthy()
                    }
                }
                if (json.resourceType === 'Bundle') {
                    let bundle : Bundle = json
                    if (bundle.entry != undefined) {
                        for (let entry of bundle.entry) {
                            // Disable profile check for Parameters
                            if (entry.resource !== undefined && entry.resource.meta != undefined && entry.resource.resourceType !== 'Parameters') {
                              if (failOnWarning == true) {
                                expect(entry.resource.meta.profile == undefined).toBeTruthy()
                              }
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
                                                    test('Verify '+resource.type + ' SearchParameter  = '+searchParameter.name, async () => {

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
                test('FHIR Validation', async () => {
                    const response = await client.post('/$validate', resource).catch(function (error) {
                        return error.response
                    })
                    expect(response.status === 200 || response.status === 400).toBeTruthy()
                    
                    //we can ignore warnings on retired resources - these would not be in a balloted package
                     console.info('status of ' + json.name + ' - ' + json.status);
   
                    if (json.status == 'retired') {
                      resourceChecks(response, false)
                    } else {
                      resourceChecks(response, failOnWarning)
                    }
                    expect(response.status).toEqual(200)
                });
            }
        }
    )
}

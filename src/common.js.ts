import axios from "axios";
import {OperationOutcome, OperationOutcomeIssue, Patient} from "fhir/r4";
import fs from "fs";
import path from "path";

export const basePath = "/FHIR/R4"

var Fhir = require('fhir').Fhir;

export let defaultBaseUrl = 'http://localhost:9001';


export async function validate(resource,contentType ) {

    const response = await axios.post(`${defaultBaseUrl}/$validate`,
        resource,
        {
            headers: {
                'Content-Type': contentType
            }
        });
    return response;
}



export const api = (baseUrl = defaultBaseUrl) => ({
    validate: (resource) => axios.post(`${baseUrl}/$validate`, resource)
        .then(response => response.data)

})

export function getContentType(file) {
    var contentType = 'application/fhir+json';
    var fileExtension = file.split('.').pop();
    if (fileExtension == 'xml' || fileExtension == 'XML') contentType ='application/fhir+xml';
    return contentType;
}

export function resourceChecks(response: any) {

    const resource: any = response.body;
    expect(resource.resourceType).toEqual('OperationOutcome');
    expect(errorsCheck(resource))
}

export function resourceCheckErrorMessage(response: any, message: string) {

    const resource: any = response.body;
    expect(resource.resourceType).toEqual('OperationOutcome');
    expect(haserrorMessage(resource)).toEqual(true)
    if (message != undefined) expect(errorMessageCheck(resource,message))
}

export async function getPatient(): Promise<any> {
    const resource: any = await fs.readFileSync('Examples/pass/patient.json', 'utf8');
    return resource;
}

export async function getResource(file: string): Promise<any> {
    const resource: any = await fs.readFileSync(file, 'utf8');
    return resource;
}


export function getJson(file, resource) {
    var fileExtension = file.split('.').pop();
    if (fileExtension == 'xml' || fileExtension == 'XML') {
        var fhir = new Fhir();
        var json = fhir.xmlToJson(resource);
        //console.log(json);
        return json;
    } else {
        return resource;
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

function haserrorMessage(resource): boolean  {
    const operationOutcome: OperationOutcome = resource;
    let warn=0;
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

function errorMessageCheck(resource, message) :boolean {
    const operationOutcome: OperationOutcome = resource;
    let warn=0;
    let errorMessage = 'None found';
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {

            switch (issue.severity) {
                case "error":
                case "fatal":
                    errorMessage = getErrorFull(issue);
                    if (errorMessage.includes(message)) return true;
            }
        }
    }
    throw new Error('Expected: ' + message + ' Found: '+errorMessage)
}

function errorsCheck(resource) {
    const operationOutcome: OperationOutcome = resource;
    let warn=0;
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {

            switch (issue.severity) {
                case "error":
                case "fatal":
                    if (raiseError(issue)) throw new Error(getErrorFull(issue))
                    break;
                case "warning":
                    if (raiseWarning(issue)) throw new Error(getErrorFull(issue))
                    warn++;
                    break;
            }
        }
    }
   // if (warn>5) console.log("Warnings "+warn);

}

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export function wait(ms) {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
        now = Date.now();
    }
}

function getErrorFull(issue: OperationOutcomeIssue) {
    let error = issue.diagnostics;
    if (issue.location != undefined) {
        for(let location of issue.location) {
            error += ' [ Location - ' + location + ']'
        }
    }
    return error;
}
function raiseWarning(issue: OperationOutcomeIssue): boolean {
    if (issue != undefined && issue.diagnostics != undefined) {
        if (issue.diagnostics.includes('incorrect type for element')) {
            return true;
        }
        if (issue.diagnostics.includes('Error HTTP 401')) {
            return true;
        }
    }
    return false;
}
function raiseError(issue: OperationOutcomeIssue) : boolean {
    if (issue != undefined && issue.diagnostics != undefined) {

        // List of errors to ignore
        if (issue.diagnostics.includes('could not be resolved, so has not been checked')) return false;
        // fault with current 5.5.1 validation
        if ( issue.diagnostics.includes('http://hl7.org/fhir/ValueSet/units-of-time')) return false;
        if ( issue.diagnostics.includes('NHSNumberVerificationStatus')) return false;
    }
    return true;
}


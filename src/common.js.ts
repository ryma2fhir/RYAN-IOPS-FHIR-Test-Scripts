import axios from "axios";
import {OperationOutcome, OperationOutcomeIssue, Patient} from "fhir/r4";

export const basePath = "/FHIR/R4"

var Fhir = require('fhir').Fhir;

export let defaultBaseUrl = 'http://localhost:9001';

export let patient : Patient = {
        resourceType: "Patient",
        identifier: [
            {
                "system": "https://fhir.nhs.uk/Id/nhs-number",
                "value": "9000000009"
            }
        ],
        name: [
            {
                given: [
                    "Jane"
                ],
                family: "Smith",
                prefix: [
                    "Mrs"
                ],
                suffix: [
                    "MBE"
                ]
            }
        ],
        gender: "female",
        birthDate: "2010-10-22",
        generalPractitioner: [
            {
                "identifier": {
                    "system": "https://fhir.nhs.uk/Id/ods-organization-code",
                    "value": "Y12345"
                }
            }
        ],
        address: [
            {

                line: [
                    "1 Trevelyan Square",
                    "Boar Lane",
                    "City Centre",
                    "Leeds",
                    "West Yorkshire"
                ],
                postalCode: "LS1 6AE"
            }
        ]
    }
;

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

export function resourceChecks(response: any, file) {

    const resource: any = response.body;
    expect(resource.resourceType).toEqual('OperationOutcome');
    expect(errorsCheck(resource))
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

function errorsCheck(resource) {
    const operationOutcome: OperationOutcome = resource;
    let success=true;
    let warn=0;
    if (operationOutcome.issue !== undefined) {
        for (const issue of operationOutcome.issue) {
            if (issue.severity == "error") success = false
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
    }
    return false;
}
function raiseError(issue: OperationOutcomeIssue) : boolean {
    if (issue != undefined && issue.diagnostics != undefined) {
        if (issue.diagnostics.includes('could not be resolved, so has not been checked')) {
            return false;
        }
    }
    return true;
}


import {defaultBaseUrl, getJson, getPatient, getResource, resourceCheckErrorMessage, resourceChecks} from "./common.js";
import supertest from "supertest"
import {jest} from "@jest/globals";
import fs from "fs";

const args = require('minimist')(process.argv.slice(2))
const client = () => {
    const url = defaultBaseUrl
    return supertest(url)
}

it('Validator is functioning ',async function () {
    await client().get('/_status').expect(200)
});

function testFile(file) {
    const resource: any = fs.readFileSync(file, 'utf8');

    it('Test HL7 FHIR resource passes validation ' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate')
            .set("Content-Type", 'application/fhir+xml')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            .expect(200)
            .then((response: any) => {
                    resourceChecks(response)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}

function testFileError(testDescription, file,message) {
    const resource: any = fs.readFileSync(file, 'utf8');

    it(testDescription + ' Filename = ' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate')
            .set("Content-Type", 'application/fhir+xml')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            .expect(200)
            .then((response: any) => {
                    resourceCheckErrorMessage(response,message)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}



describe('Testing validation api is functioning', () => {
    testFile('Examples/pass/patient.json')
    testFile('Examples/pass/MedicationRequest-pass.json')
    testFile('Examples/pass/MedicationDispense-pass.json')

    testFile('Examples/pass/Bundle-prescripton-order-12 Item.json')
});

describe('Testing validation fails simple resource', () => {
    testFileError('Check validation fails when no NHS Number is supplied','Examples/fail/patientError.json','Patient.identifier:nhsNumber: minimum required = 1')

    testFileError('Check validation fails when no medication code is supplied', 'Examples/fail/MedicationRequest-missingMedication.json',undefined)
    testFileError('Check validation fails when no medication code is supplied','Examples/fail/MedicationRequest-missingMedication.json','MedicationRequest.medication[x]: minimum required = 1')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system', 'Examples/fail/MedicationRequest-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')

    testFileError('Check validation fails when daysSupply has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-invalidaUnitOfMeasure.json','Validation failed for \'http://unitsofmeasure.org')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system','Examples/fail/MedicationDispense-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')
    testFileError('Check validation fails when identifier is an object not an array','Examples/fail/MedicationRequest-invalidJSON.json', undefined)
    testFileError('Check validation fails when MedicationRequest is not referenced in the MessageHeader.focus but is present','Examples/fail/Bundle-prescripton-order-12 Item-incorrectFocus.json', undefined)
    testFileError('Check validation fails when Location is referenced but not present in the FHIR Message','Examples/fail/Bundle-prescripton-order-12 Item-locationNotPresent.json', undefined)
});


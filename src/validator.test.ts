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

function testFile(testDescription,file) {
    const resource: any = fs.readFileSync(file, 'utf8');

    it(testDescription + ' filename' + file, async () => {
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



describe('Testing validation passes for valid HL7 FHIR resources', () => {
    testFile('Test HL7 FHIR resource passes validation ','Examples/pass/patient.json')
    testFile('Test HL7 FHIR resource passes validation ','Examples/pass/MedicationRequest-pass.json')
    testFile('Test HL7 FHIR resource passes validation ','Examples/pass/MedicationDispense-pass.json')

    testFile('Test HL7 FHIR Message Bundle passes validation ','Examples/pass/Bundle-prescription.json')
    testFile('Test HL7 FHIR Seaarch QuestionnaireResponse Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDExemption.json')
    testFile('Test HL7 FHIR Seaarch Immmunization Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDImmunization.json')
    testFile('Test HL7 FHIR Seaarch Observation Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDObservation.json')
    testFile('Test resource with unknown profile passes validation (AEA-1806) ','Examples/pass/MedicationRequest-alienProfile-pass.xml')
    testFile('Test prescription-order-response is tested with correct NHSDigital-MedicationRequest-Outcome profile and not NHSDigital-MedicationRequest (AEA-1805) ','Examples/pass/outpatient-four-items-cancel-subsequent-response-morphine.json')
});

describe('Testing validation fails invalid FHIR resources', () => {
    testFileError('Check validation fails when no NHS Number is supplied','Examples/fail/patientError.json','Patient.identifier:nhsNumber: minimum required = 1')

    // MedicationRequest
    testFileError('Check validation fails when no medication code is supplied', 'Examples/fail/MedicationRequest-missingMedication.json',undefined)
    testFileError('Check validation fails when no medication code is supplied','Examples/fail/MedicationRequest-missingMedication.json','MedicationRequest.medication[x]: minimum required = 1')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system', 'Examples/fail/MedicationRequest-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')
    testFileError('Check validation fails when identifier is an object not an array (AEA-1820)','Examples/fail/MedicationRequest-invalid-json.json', undefined)

    // MedicationDispense
    testFileError('Check validation fails when daysSupply has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-invalidaUnitOfMeasure.json','Validation failed for \'http://unitsofmeasure.org')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system','Examples/fail/MedicationDispense-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')

    testFileError('Check validation fails when MedicationRequest references Patient in the MessageHeader.focus but is present','Examples/fail/Bundle-prescription-order-incorrectFocus.json', 'Invalid Resource target type.')
    // Should be in MessageDefinition??
    testFileError('Check validation fails when Location is referenced but not present in the FHIR Message','Examples/fail/Bundle-prescription-order-locationNotPresent.json', undefined)
    testFileError('Check validation fails when extra MedicationRequest is included but not present in the FHIR Message','Examples/fail/Bundle-prescription-order-extraMedicationRequest.json', undefined)

    testFileError('Check validation fails when Message Bundle.entry.fullUrl is absent','Examples/fail/Bundle-prescription-order-missingFullUrl.json','Bundle entry missing fullUrl')
    testFileError('Check validation fails when SearchSet Bundle.entry.fullUrl is absent (AEA-1828)','Examples/fail/Bundle-searchset-COVIDExemption-missingFullUrl.json','fullUrl')

});


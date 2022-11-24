import {
    defaultBaseUrl,
    getJson,
    getPatient,
    getResource,
    resourceCheckErrorMessage,
    resourceChecks,
    resourceCheckWarningMessage
} from "./common.js";
import supertest from "supertest"
import {jest} from "@jest/globals";
import fs from "fs";

const args = require('minimist')(process.argv.slice(2))
const client = () => {
    const url = defaultBaseUrl
    //console.log(url)
    return supertest(url)
}

let terminology = true;





it('Validator is functioning ',async function () {
    await client().get('/metadata').expect(200)
});

function testFile(testDescription,file) {
    const resource: any = fs.readFileSync(file, 'utf8');

    test(testDescription + ' filename' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate')
            .retry(2)
            .set("Content-Type", 'application/fhir+json')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            .expect(200)
            .then((response: any) => {
                    resourceChecks(response, true)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}

function testFileWithProfile(profile, testDescription,file) {
    const resource: any = fs.readFileSync(file, 'utf8');

    test(testDescription + ' filename ' + file + ' profile = '+ profile, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate?profile='+profile)
            .retry(2)
            .set("Content-Type", 'application/fhir+json')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            .expect(200)
            .then((response: any) => {
                    resourceChecks(response, true)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}

function testFileError(testDescription, file,message) {
    const resource: any = fs.readFileSync(file, 'utf8');

    test(testDescription + ' Filename = ' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate')
            .retry(2)
            .set("Content-Type", 'application/fhir+json')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            //.expect(200)
            .then((response: any) => {
                    resourceCheckErrorMessage(response,message, true)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}

function testFileErrorProfile(testDescription, file,message, profile) {
    const resource: any = fs.readFileSync(file, 'utf8');

    test(testDescription + ' Filename = ' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate?profile='+profile)
            .retry(2)
            .set("Content-Type", 'application/fhir+json')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            //.expect(200)
            .then((response: any) => {
                    resourceCheckErrorMessage(response,message, true)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}


function testFileWarning(testDescription, file,message) {
    const resource: any = fs.readFileSync(file, 'utf8');

    test(testDescription + ' Filename = ' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate')
            .retry(2)
            .set("Content-Type", 'application/fhir+json')
            .set("Accept", 'application/fhir+json')
            .send(getJson(file, resource))
            .expect(200)
            .then((response: any) => {
                    resourceCheckWarningMessage(response,message)
                },
                error => {
                    throw new Error(error.message)
                })
    });
}



describe('Testing validation passes for valid HL7 FHIR resources', () => {
    // Patient
    testFile('Test HL7 FHIR resource passes validation ','Examples/pass/patient.json')

    // MedicationRequest
    testFile('Test HL7 FHIR resource passes validation ','Examples/pass/MedicationRequest-pass.json')

    // MedicationDispense
    testFile('Test HL7 FHIR resource passes validation ','Examples/pass/MedicationDispense-pass.json')

    // PractitionerRole
    testFile('Test HL7 FHIR resource passes validation PractitionerRole','Examples/pass/PractitionerRole-pass.json')

    // Bundle
    testFile('Test HL7 FHIR Message Bundle passes validation ','Examples/pass/Bundle-prescription.json')

    testFile('Test HL7 FHIR Seaarch Immmunization Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDImmunization.json')
    testFile('Test HL7 FHIR Seaarch Observation Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDObservation.json')
    testFile('Test resource with unknown profile passes validation (AEA-1806) ','Examples/pass/MedicationRequest-alienProfile-pass.json')
    testFile('Test prescription-order-response is tested with correct NHSDigital-MedicationRequest-Outcome profile and not NHSDigital-MedicationRequest (AEA-1805) ','Examples/pass/outpatient-four-items-cancel-subsequent-response-morphine.json')
    testFile('Test EPS fhirPath constraint issue (present in 6.2.x HAPI) ','Examples/pass/MedicationRequest-constraints.json')
});

describe('Testing validation fails invalid FHIR resources', () => {

    //Patient
    testFileErrorProfile('Check validation fails when no NHS Number is supplied','Examples/fail/patientError.json','Patient.identifier:nhsNumber: minimum required = 1','https://fhir.nhs.uk/StructureDefinition/NHSDigital-Patient-PDS')
    testFileError('Check validation fails when no Scottish CHI Number is supplied','Examples/fail/patient-chi-number.json','Supplied NHS Number is outside the English and Welsh NHS Number')

    // PractitionerRole
    testFileError('Check validation fails on PractitionerRole when invalid GMC Number is supplied','Examples/fail/PractitionerRole-invalidGMC.json','GMC must be of the format CNNNNNNN')


    // MedicationRequest
    testFileError('Check validation fails when no medication code is supplied', 'Examples/fail/MedicationRequest-missingMedication.json',undefined)
  //  testFileError('Check validation fails when no medication code is supplied','Examples/fail/MedicationRequest-missingMedication.json','MedicationRequest.medication[x]: minimum required = 1')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system', 'Examples/fail/MedicationRequest-dmdCode.json','CodeableConcept.coding:SNOMED')
    testFileError('Check validation fails when identifier is an object not an array (AEA-1820)','Examples/fail/MedicationRequest-invalid-json.json', undefined)

    // MedicationDispense
    testFileError('Check validation fails when daysSupply has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-daysSupply-invalidaUnitOfMeasure.json',undefined)
    testFileError('Check validation fails when dosageInstruction.timing has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-timing-invalidaUnitOfMeasure.json','UnitsOfTime')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system','Examples/fail/MedicationDispense-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')

    testFileError('Check validation fails when MedicationRequest references Patient in the MessageHeader.focus but is present','Examples/fail/Bundle-prescription-order-incorrectFocus.json', 'Invalid Resource target type.')
    // Should be in MessageDefinition??
    testFileWarning('Check validation fails when Location is referenced but not present in the FHIR Message','Examples/fail/Bundle-prescription-order-locationNotPresent.json', 'URN reference is not locally contained within the bundle')

    testFileError('Check validation fails when Message Bundle.entry.fullUrl is absent','Examples/fail/Bundle-prescription-order-missingFullUrl.json','Bundle entry missing fullUrl')
    testFileError('Check validation fails when SearchSet Bundle.entry.fullUrl is absent (AEA-1828)','Examples/fail/Bundle-searchset-COVIDExemption-missingFullUrl.json','Except for transactions and batches')

    testFileError('Test HL7 FHIR Message Bundle passes validation (AEA-1833)','Examples/fail/Bundle-prescription-rest-references.json','Bundled or contained reference not found within the bundle')
});



describe('Terminology Tests', () => {
    if (terminology) {
        testFileError('Check validation fails when non dm+d SNOMED drug code is supplied', 'Examples/fail/MedicationRequest-not-dmd-drug.json', 'is not in the value set')
    }
});






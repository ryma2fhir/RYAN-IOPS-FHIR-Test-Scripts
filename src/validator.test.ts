import {defaultBaseUrl, getJson, getPatient, getResource, resourceCheckErrorMessage, resourceChecks} from "./common.js";
import supertest from "supertest"
import {jest} from "@jest/globals";
import fs from "fs";

const args = require('minimist')(process.argv.slice(2))
const client = () => {
    const url = defaultBaseUrl
    return supertest(url)
}

let terminology = true;

// Need to check the capabilities of the validation service and decide if to run terminology tests
if (process.env.ONTO_CLIENT_ID == undefined) terminology = false;



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
    testFileError('Check validation fails when daysSupply has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-daysSupply-invalidaUnitOfMeasure.json','Validation failed for \'http://unitsofmeasure.org')
    testFileError('Check validation fails when dosageInstruction.timing has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-timing-invalidaUnitOfMeasure.json','UnitsOfTime')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system','Examples/fail/MedicationDispense-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')

    testFileError('Check validation fails when MedicationRequest references Patient in the MessageHeader.focus but is present','Examples/fail/Bundle-prescription-order-incorrectFocus.json', 'Invalid Resource target type.')
    // Should be in MessageDefinition??
    testFileError('Check validation fails when Location is referenced but not present in the FHIR Message','Examples/fail/Bundle-prescription-order-locationNotPresent.json', 'Unable to find')

    testFileError('Check validation fails when Message Bundle.entry.fullUrl is absent','Examples/fail/Bundle-prescription-order-missingFullUrl.json','Bundle entry missing fullUrl')
    testFileError('Check validation fails when SearchSet Bundle.entry.fullUrl is absent (AEA-1828)','Examples/fail/Bundle-searchset-COVIDExemption-missingFullUrl.json','fullUrl')

    testFileError('Test HL7 FHIR Message Bundle passes validation (AEA-1833)','Examples/fail/Bundle-prescription-rest-references.json','Bundled or contained reference not found within the bundle')
});


describe('Tests to be re-evaluated as they should be not be passing', () => {
    // This should fail as the subject reference is not in the Bundle


    // TODO need to discuss if this is an error, should at least be a warning.
    testFile('Check validation fails when extra MedicationRequest is included but not present in the FHIR Message [AEA-1835]','Examples/fail/Bundle-prescription-order-extraMedicationRequest.json')
});

describe('Tests against a supplier set of examples', () => {
    // This should fail as the subject reference is not in the Bundle


    // TODO need to discuss if this is an error, should at least be a warning.
    testFile('Check validation passes : 12 Items - Message 1','Examples/supplierA/12 Items - Message 1 - 7f0ad496-f165-41e8-8751-1b6c2dea8752.json')
    testFile('Check validation passes : 12 Items - Message 2','Examples/supplierA/12 Items - Message 2 - 41bfb0d1-498f-4edf-bb50-8d31206ce2ac.json')
    testFile('Check validation passes : 12 Items - Message 3','Examples/supplierA/12 Items - Message 3 - a0628c74-7c4f-4a2a-a170-c6478a5f799c.json')
    testFile('Check validation passes : Controlled Drugs','Examples/supplierA/Controlled Drugs - 53e7da06-be64-4d7e-a565-551c63283111.json')
    testFile('Check validation passes : Endorsements','Examples/supplierA/Endorsements - 699f577c-7e56-4f8c-914a-6a175300c47b.json')
    testFile('Check validation passes : Four Items','Examples/supplierA/Four Items - 5f98c9b0-647b-4309-a161-dea5f2030b7b.json')
    testFile('Check validation passes : Long Description','Examples/supplierA/Long Description - 72d5b7d4-e992-4f34-a70d-c6e0299d7f81.json')
    testFile('Check validation passes : Long Instructions','Examples/supplierA/Long Instructions - 28ac250f-ad32-406b-9bb4-0957f74ad54b.json')
    testFile('Check validation passes : Single Item','Examples/supplierA/Single Item - 9a413654-2d44-4d8f-8357-132ab2de6c8f.json')
});

describe('Test Paracetamol', () => {
    testFileError('Check validation fails  : Paracetamol VTM','Examples/fail/MedicationRequest-Paracetamol-vtm.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationRequest-Code')
    testFile('Check validation passes  : Paracetamol VMP','Examples/pass/MedicationRequest-Paracetamol-vmp.json')
    testFile('Check validation passes  : Paracetamol AMP','Examples/pass/MedicationRequest-Paracetamol-amp.json')
    testFileError('Check validation fails  : Paracetamol AMPP','Examples/fail/MedicationRequest-Paracetamol-ampp.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationRequest-Code')
    testFileError('Check validation fails  : Paracetamol VMPP','Examples/fail/MedicationRequest-Paracetamol-vmpp.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationRequest-Code')
});

describe('Terminology Tests', () => {
    if (terminology) {
        testFileError('Check validation fails when non dm+d SNOMED drug code is supplied', 'Examples/fail/MedicationRequest-not-dmd-drug.json', 'is not in the value set')
    }
});

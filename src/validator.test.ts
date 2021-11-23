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
    return supertest(url)
}

let terminology = true;





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
            .retry(2)
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
            .retry(2)
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

function testFileWarning(testDescription, file,message) {
    const resource: any = fs.readFileSync(file, 'utf8');

    it(testDescription + ' Filename = ' + file, async () => {
        // Initial terminology queries can take a long time to process - cached responses are much more responsive
        jest.setTimeout(30000)
        await client()
            .post('/$validate')
            .retry(2)
            .set("Content-Type", 'application/fhir+xml')
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


    testFile('Test HL7 FHIR Seaarch QuestionnaireResponse Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDExemption.json')
    // logged as https://simplifier.net/hl7fhirukcorer4/~issues/1839 this should be a pass?
    testFileWarning('Test HL7 FHIR Seaarch Immmunization Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDImmunization.json','None of the codings provided are in the value set https://fhir.hl7.org.uk/ValueSet/UKCore-ImmunizationExplanationReason')
    testFile('Test HL7 FHIR Seaarch Observation Bundle passes validation ','Examples/pass/Bundle-searchset-COVIDObservation.json')
    testFile('Test resource with unknown profile passes validation (AEA-1806) ','Examples/pass/MedicationRequest-alienProfile-pass.xml')
    testFile('Test prescription-order-response is tested with correct NHSDigital-MedicationRequest-Outcome profile and not NHSDigital-MedicationRequest (AEA-1805) ','Examples/pass/outpatient-four-items-cancel-subsequent-response-morphine.json')
});

describe('Testing validation fails invalid FHIR resources', () => {

    //Patient
    testFileError('Check validation fails when no NHS Number is supplied','Examples/fail/patientError.json','Patient.identifier:nhsNumber: minimum required = 1')
    testFileError('Check validation fails when no Scottish CHI Number is supplied','Examples/fail/patient-chi-number.json','Supplied NHS Number is outside the English and Welsh NHS Number')

    // PractitionerRole
    testFileWarning('Check validation fails on PractitionerRole when invalid GMC Number is supplied','Examples/fail/PractitionerRole-invalidGMC.json','GMC must be of the format CNNNNNNN')


    // MedicationRequest
    testFileError('Check validation fails when no medication code is supplied', 'Examples/fail/MedicationRequest-missingMedication.json',undefined)
    testFileError('Check validation fails when no medication code is supplied','Examples/fail/MedicationRequest-missingMedication.json','MedicationRequest.medication[x]: minimum required = 1')
    testFileError('Check validation fails when medication code is supplied with the future dm+d system', 'Examples/fail/MedicationRequest-dmdCode.json','CodeableConcept.coding:SNOMED: minimum required = 1')
    testFileError('Check validation fails when identifier is an object not an array (AEA-1820)','Examples/fail/MedicationRequest-invalid-json.json', undefined)

    // MedicationDispense
    testFileError('Check validation fails when daysSupply has an incorrect unitsofmeasure code','Examples/fail/MedicationDispense-daysSupply-invalidaUnitOfMeasure.json','Validation failed for \'http://unitsofmeasure')
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
    testFileWarning('Check validation passes : 12 Items - Message 1','Examples/supplierA/12 Items - Message 1 - 7f0ad496-f165-41e8-8751-1b6c2dea8752.json','GMC must be of the format')
    testFileWarning('Check validation passes : 12 Items - Message 2','Examples/supplierA/12 Items - Message 2 - 41bfb0d1-498f-4edf-bb50-8d31206ce2ac.json','GMC must be of the format')
    testFileWarning('Check validation passes : 12 Items - Message 3','Examples/supplierA/12 Items - Message 3 - a0628c74-7c4f-4a2a-a170-c6478a5f799c.json','GMC must be of the format')
    testFileWarning('Check validation passes : Controlled Drugs','Examples/supplierA/Controlled Drugs - 53e7da06-be64-4d7e-a565-551c63283111.json','GMC must be of the format')
    testFileWarning('Check validation passes : Endorsements','Examples/supplierA/Endorsements - 699f577c-7e56-4f8c-914a-6a175300c47b.json','GMC must be of the format')
    testFileWarning('Check validation passes : Four Items','Examples/supplierA/Four Items - 5f98c9b0-647b-4309-a161-dea5f2030b7b.json','GMC must be of the format')
    testFileWarning('Check validation passes : Long Description','Examples/supplierA/Long Description - 72d5b7d4-e992-4f34-a70d-c6e0299d7f81.json','GMC must be of the format')
    testFileWarning('Check validation passes : Long Instructions','Examples/supplierA/Long Instructions - 28ac250f-ad32-406b-9bb4-0957f74ad54b.json','GMC must be of the format')
    testFileWarning('Check validation passes : Single Item','Examples/supplierA/Single Item - 9a413654-2d44-4d8f-8357-132ab2de6c8f.json','GMC must be of the format')
});

describe('Test dm+d valuesets Paracetamol', () => {
    testFileError('Check validation fails  : MedicationRequest Paracetamol VTM','Examples/dmdTests/MedicationRequest-Paracetamol-vtm.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationRequest-Code')
    testFile('Check validation passes  : MedicationRequest Paracetamol VMP','Examples/dmdTests/MedicationRequest-Paracetamol-vmp.json')
    testFile('Check validation passes  : MedicationRequest Paracetamol AMP','Examples/dmdTests/MedicationRequest-Paracetamol-amp.json')
    testFileError('Check validation fails  : MedicationRequest Paracetamol AMPP','Examples/dmdTests/MedicationRequest-Paracetamol-ampp.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationRequest-Code')
    testFileError('Check validation fails  : MedicationRequest Paracetamol VMPP','Examples/dmdTests/MedicationRequest-Paracetamol-vmpp.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationRequest-Code')

    testFileError('Check validation fails  : MedicationDispense Paracetamol VTM','Examples/dmdTests/MedicationDispense-Paracetamol-vtm.json','is not in the value set https://fhir.nhs.uk/ValueSet/NHSDigital-MedicationDispense-Code')
    testFile('Check validation passes  : MedicationDispense Paracetamol VMP','Examples/dmdTests/MedicationDispense-Paracetamol-vmp.json')
    testFile('Check validation passes  : MedicationDispense Paracetamol AMP','Examples/dmdTests/MedicationDispense-Paracetamol-amp.json')
    testFile('Check validation passes  : MedicationDispense Paracetamol AMPP','Examples/dmdTests/MedicationDispense-Paracetamol-ampp.json')
    testFile('Check validation passes  : MedicationDispense Paracetamol VMPP','Examples/dmdTests/MedicationDispense-Paracetamol-vmpp.json')

});

describe('Test dosage instructions', () => {
    testFile('Check validation passes  : MedicationDispense Paracetamol VMPP','Examples/dmdTests/MedicationRequest-dosageInstruction-Epoetin.json')
    testFileWarning('Check validation passes  : MedicationDispense Paracetamol VMPP','Examples/dmdTests/MedicationRequest-dosageInstruction-Epoetin-fail.json','None of the codings provided are in the value set https://fhir.hl7.org.uk/ValueSet/UKCore-SubstanceOrProductAdministrationRoute')
    testFileWarning('Check validation passes  : MedicationDispense Paracetamol VMPP','Examples/dmdTests/MedicationRequest-dosageInstruction-Epoetin-fail.json','None of the codings provided are in the value set https://fhir.hl7.org.uk/ValueSet/UKCore-MedicationDosageMethod')
})

describe('Test prescription orders', ()=> {
    testFile('Check validation passes  : GP prescription-order','Examples/prescriptions/Bundle-prescription-gp.json')
    testFileWarning('Check validation passes  : Acute prescription-order no healthcare service','Examples/prescriptions/Bundle-prescription-acute-noHealthcareService.json','GMC must be of the format')
});

describe('Terminology Tests', () => {
    if (terminology) {
        testFileError('Check validation fails when non dm+d SNOMED drug code is supplied', 'Examples/fail/MedicationRequest-not-dmd-drug.json', 'is not in the value set')
    }
});


describe('CourseOfTherapy Tests', () => {

    // Repeat dispensing
        testFile('Check repeat dispensing original-order passes', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-original-order.json')
        testFileError('Check repeat dispensing original-order with issues fails', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-original-order-withIssues.json','eps-13')
        testFileError('Check repeat dispensing reflex-order without issues fails', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-reflex-order-withoutIssues.json','eps-14')
        testFile('Check repeat dispensing reflex-order passes', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-reflex-order.json')
        testFileError('Check repeat dispensing reflex-order with no basedOn fails with eps-10', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-reflex-order-noBasedOn.json', 'eps-10')
        testFileWarning('Check repeat dispensing with intent = order gives warning eps-7', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-original-order-wrong-intent.json', 'eps-7')
        testFileError('Check repeat dispensing reflex-order with six authorised issues eps-11', 'Examples/courseOfTherapyTests/MedicationRequest-repeatDispensing-reflex-order-numberOfRepeatsAllowed-six.json','eps-11')

    // Repeats
        testFile('Check repeat passes','Examples/courseOfTherapyTests/MedicationRequest-repeat.json')
        testFileWarning('Check repeat with no basedOn gives warning eps-12', 'Examples/courseOfTherapyTests/MedicationRequest-repeat-noBasedOn.json', 'eps-12')
        testFileWarning('Check repeat with no issue number gives warning eps-15', 'Examples/courseOfTherapyTests/MedicationRequest-repeat-noIssueNumber.json', 'eps-15')

    // Acute
        testFileError('Check acute passes with number of repeats allowed fails','Examples/courseOfTherapyTests/MedicationRequest-acute-withNumberOfRepeatsAllowed.json','eps-6')
        testFileError('Check acute passes with repeat extension fails','Examples/courseOfTherapyTests/MedicationRequest-acute-withRepeatExtension.json','eps-16')

});

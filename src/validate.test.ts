import {basePath, defaultBaseUrl, downloadPackage, getJson, getPatient, resourceChecks} from "./common.js";

import * as fs from "fs";
import supertest from "supertest"
import {jest} from "@jest/globals";

const args = require('minimist')(process.argv.slice(2))
//const args = process.argv

let source = '../'
let examples: string

let failOnWarning = false;



if (args!= undefined) {
    if (args['source']!= undefined) {
        source = args['source'];

    }
    if (args['examples']!= undefined) {
        examples = args['folder'];
    }
}


it('Validator is functioning ',async function () {
    await client().get('/metadata').expect(200)
});


const client = () => {
    const url = defaultBaseUrl
    return supertest(url)
}

const resource: any = fs.readFileSync(source + '/package.json', 'utf8')
if (resource != undefined) {
    let pkg= JSON.parse(resource)

    if (pkg.dependencies != undefined) {
        for (let key in pkg.dependencies) {
            if (key.startsWith('fhir.r4.ukcore')) {
                failOnWarning = true;
                console.log('ukcore dependency found, enabled STRICT validation')
            }
        }
    }
}

async function validateFHIR(fhirResource: any) {
    await client()
        .post('/$validate')
        .retry(3)
        .set("Content-Type", 'application/fhir+json')
        .set("Accept", 'application/fhir+json')
        .send(fhirResource)
        .expect(200)
        .then((response: any) => {
                resourceChecks(response, failOnWarning)
            },
            error => {
                if (!error.message.includes('Async callback was not invoked within the')) throw new Error(error.message)
            })

}

function testFolder(dir) {

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);
        list.forEach(function (file) {
            if (file.includes('.DS_Store')) return;
            file = dir + "/" + file;
            const resource: any = fs.readFileSync(file, 'utf8');

            it('Validate ' + file, async () => {
                // Initial terminology queries can take a long time to process - cached responses are much more responsive
                jest.setTimeout(40000)
                let fhirResource = getJson(file, resource)
                let json =JSON.parse(fhirResource)
                if (json.resourceType == "StructureDefinition") {
                    if (json.kind == "logical") {
                        // skip for now
                    } else {
                        validateFHIR(fhirResource)
                    }

                }
                else {
                   // console.log(json.resourceType)
                    validateFHIR(fhirResource)
                }

            });
        })
    }
}



    describe('Parsing supplied folder ', () => {
        if (examples != undefined) testFolder(examples);
    });

    describe('Parsing folder Appointment', () => {
        testFolder(source + 'Appointment');
    });

    describe('Parsing folder Bundle', () => {
        testFolder(source + 'Bundle');
    });
    describe('Parsing folder CapabilityStatement', () => {
        testFolder(source + 'CapabilityStatement');
    });

    describe('Parsing folder Claim', () => {
    testFolder(source + 'Claim');
    });

    describe('Parsing folder CodeSystem', () => {
        testFolder(source + 'CodeSystem');
    });

    describe('Parsing folder ConceptMap', () => {
        testFolder(source + 'ConceptMap');
    });

describe('Parsing folder CommunicationRequest', () => {
    testFolder(source + 'CommunicationRequest');
});

describe('Parsing folder DocumentReference', () => {
    testFolder(source + 'DocumentReference');
});
    describe('Parsing folder Examples', () => {
        testFolder(source + 'Examples');
    });

describe('Parsing folder Encounter', () => {
    testFolder(source + 'Encounter');
});


describe('Parsing folder HealthcareService', () => {
    testFolder(source + 'HealthcareService');
});

describe('Parsing folder Immunization', () => {
    testFolder(source + 'Immunization');
});


    describe('Parsing folder MessageDefinition', () => {
        testFolder(source + 'MessageDefinition');
    });

    describe('Parsing folder MedicationDispense', () => {
        testFolder(source + 'MedicationDispense');
    });

    describe('Parsing folder MedicationRequest', () => {
        testFolder(source + 'MedicationRequest');
    });

    describe('Parsing folder NamingSystem', () => {
        testFolder(source + 'NamingSystem');
    });

describe('Parsing folder Observation', () => {
    testFolder(source + 'Observation');
});

    describe('Parsing folder ObservationDefinition', () => {
        testFolder(source + 'ObservationDefinition');
    });

    describe('Parsing folder OperationDefinition', () => {
        testFolder(source + 'OperationDefinition');
    });

    describe('Parsing folder OperationOutcome', () => {
        testFolder(source + 'OperationOutcome');
    });
describe('Parsing folder Organization', () => {
    testFolder(source + 'Organization');
});

describe('Parsing folder Questionnaire', () => {
        testFolder(source + 'Questionnaire');
    });

describe('Parsing folder QuestionnaireResponse', () => {
    testFolder(source + 'QuestionnaireResponse');
});

describe('Parsing folder Parameters', () => {
    testFolder(source + 'Parameters');
});

describe('Parsing folder Patient', () => {
    testFolder(source + 'Patient');
});
describe('Parsing folder Practitioner', () => {
    testFolder(source + 'Practitioner');
});
describe('Parsing folder PractitionerRole', () => {
    testFolder(source + 'PractitionerRole');
});
    describe('Parsing folder SearchParameter', () => {
        testFolder(source + 'SearchParameter');
    });

    describe('Parsing folder ServiceRequest', () => {
        testFolder(source + 'ServiceRequest');
    });

    describe('Parsing folder StructureDefinition', () => {
        testFolder(source + 'StructureDefinition');
    });

    describe('Parsing folder StructureMap', () => {
        testFolder(source + 'StructureMap');
    });

    describe('Parsing folder Subscription', () => {
        testFolder(source + 'Subscription');
    });

    describe('Parsing folder Task', () => {
        testFolder(source + 'Task');
    });

    describe('Parsing folder ValueSet', () => {
        testFolder(source + 'ValueSet');
    });

// Begin UK Core folder names

    describe('Parsing folder codesystems', () => {
        testFolder(source + 'codesystems');
    });

    describe('Parsing folder conceptmaps', () => {
        testFolder(source + 'conceptmaps');
    });

    describe('Parsing folder examples', () => {
        testFolder(source + 'examples');
    });


    describe('Parsing folder structuredefinitions', () => {
        testFolder(source + 'structuredefinitions');
    });

    describe('Parsing folder valuesets', () => {
        testFolder(source + 'valuesets');
    });

// End UK Core folder names
/*
    describe('Testing validation api is functioning', () => {
        console.log(getPatient())
        it('validation functionality test', async () => {
            await client()
                .post('/$validate')
                .set("Content-Type", "application/fhir+json; fhirVersion=4.0.1")
                .set("Accept", "application/fhir+json")
                .send(getPatient())
                .expect(200)
        });
    });
*/





import {basePath, defaultBaseUrl, getJson, patient, resourceChecks} from "./common.js";

import * as fs from "fs";
import supertest from "supertest"
import axios from "axios";

const args = require('minimist')(process.argv.slice(2))
//const args = process.argv

let path = '../'
let folder: string
let waitAttempts = 10;

function wait(ms) {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
        now = Date.now();
    }
}

if (args!= undefined) {
    if (args['path']!= undefined) {
        path = args['path'];
    }
    if (args['folder']!= undefined) {
        folder = args['folder'];
    }
}

it('Validator is functioning ',async function () {
    await client().get('/_status').expect(200)
});


const client = () => {
    const url = defaultBaseUrl
    return supertest(url)
}


function testFolder(dir) {

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);
        list.forEach(function (file) {
            if (file.includes('.DS_Store')) return;
            file = dir + "/" + file;
            const resource: any = fs.readFileSync(file, 'utf8');

            it('Validate ' + file, async () => {
                await client()
                    .post('/$validate')
                    .set("Content-Type", 'application/fhir+xml')
                    .set("Accept", 'application/fhir+json')
                    .send(getJson(file, resource))
                    .expect(200)
                    .then((response: any) => {
                        resourceChecks(response, file)
                    })
            });
        })
    }
}



    describe('Parsing supplied folder ', () => {
        if (folder != undefined) testFolder(folder);
    });

    describe('Parsing folder CapabilityStatement', () => {
        testFolder(path + 'CapabilityStatement');
    });

    describe('Parsing folder CodeSystem', () => {
        testFolder(path + 'CodeSystem');
    });


    describe('Parsing folder ConceptMap', () => {
        testFolder(path + 'ConceptMap');
    });

    describe('Parsing folder Examples', () => {
        testFolder(path + 'Examples');
    });

    describe('Parsing folder MessageDefinition', () => {
        testFolder(path + 'MessageDefinition');
    });

    describe('Parsing folder NamingSystem', () => {
        testFolder(path + 'NamingSystem');
    });

    describe('Parsing folder ObservationDefinition', () => {
        testFolder(path + 'ObservationDefinition');
    });

    describe('Parsing folder OperationDefinition', () => {
        testFolder(path + 'OperationDefinition');
    });

    describe('Parsing folder Questionnaire', () => {
        testFolder(path + 'Questionnaire');
    });


    describe('Parsing folder SearchParameter', () => {
        testFolder(path + 'SearchParameter');
    });

    describe('Parsing folder StructureDefinition', () => {
        testFolder(path + 'StructureDefinition');
    });


    describe('Parsing folder ValueSet', () => {
        testFolder(path + 'ValueSet');
    });

// Begin UK Core folder names

    describe('Parsing folder codesystems', () => {
        testFolder(path + 'codesystems');
    });

    describe('Parsing folder conceptmaps', () => {
        testFolder(path + 'conceptmaps');
    });

    describe('Parsing folder examples', () => {
        testFolder(path + 'examples');
    });

    describe('Parsing folder examples', () => {
        testFolder(path + 'examples');
    });

    describe('Parsing folder structuredefinitions', () => {
        testFolder(path + 'structuredefinitions');
    });

    describe('Parsing folder valuesets', () => {
        testFolder(path + 'valuesets');
    });

// End UK Core folder names

    describe('Testing validation api is functioning', () => {
        it('validation functionality test', async () => {
            await client()
                .post('/$validate')
                .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
                .set("Accept", "application/fhir+json")
                .send(patient)
                .expect(200)
        });
    });






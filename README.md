# IOPS-Validation

This is a typescript module used to test HL7 FHIR resources using [validation-service-fhir-r4](https://github.com/NHSDigital/validation-service-fhir-r4)
The configuration and setup of this service is not covered here.

Current status of **validation-service-fhir-r4** 


[![NHSDigital IOPS Validation)](https://github.com/NHSDigital/IOPS-Validation/actions/workflows/testingbranch.yml/badge.svg)](https://github.com/NHSDigital/IOPS-Validation/actions/workflows/testingbranch.yml)

## Prerequisite 

Install [node-js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

Running instance of the `validation-service-fhir-r4`

## Tests

### Basic Tests

Create a directory for your tests. 
Create a folder for you tests called `Examples`.
Clone this repo `git clone https://github.com/NHSDigital/IOPS-Validation.git`
Run the tests via `npm test`

### Test files in another folder

The test folder can be changed via the `examples` parameter, e.g. 

`npm test -- --examples=../ExamplesTest`

### Implementation Guide Tests

The tests can also be run against a series of folders laid out in a set way. This uses the `source` parameter, e.g. 

`npm test -- --source='../NHSDigital-FHIR-ImplementationGuide/`

This parameter with search for the following sub folders in the supplied path.

- CapabilityStatement
- CodeSystem
- ConceptMap
- Examples
- MessageDefinition
- NamingSystem
- ObservationDefinition
- OperationDefinition
- Questionnaire
- SearchParameter
- StructureDefinition
- ValueSet

## validation-service-fhir-r4 Configuration (in github workflows)

The validation-service-fhir-r4 can also be configured using this project. At present this is designed to be used in the testing of NHS Digital HL7 FHIR Implementation Guides using github workflows. This is done via 

`make -C validation configure-validation`

Which calls `npm start`

Examples of use within a workflow can be found:

- https://github.com/NHSDigital/NHSDigital-FHIR-ImplementationGuide/blob/master/.github/workflows/FHIRValidation.yml
- https://github.com/NHSDigital/NHSDigital-FHIR-Medicines-ImplementationGuide/blob/master/.github/workflows/integration.yml

# Developer Information
## Workflows

### Validation
Package-Test-Runner - Checks NHSE assets for conformance to specific UKCore packages. Useful to find breaking changes when new UKCore packages are created. Works on manual workflow run. Change `packagename` & `packageversion` within the action.
masterfhirvalidation - Validates FHIR assets to ensure conformance to FHIR and checks examples are valid and all codes within them are correct as per the ontoserver. Works on push from FHIR Repo.
testingbranch - used to test the latest validator against a test suite (currently in progress)
validator-test

### Quality Control
errorChecker - Checks for html errors in Simplifier IGs. Works on push to this repo
linkChecker - Checks for url errors in Simplifier IGs. Works on push to this repo
spellChecker - Checks for spelling errors in Simplifier IGs. Works on push to this repo
QualityControlChecker - Checks for spelling and conformance of FHIR assets. Works on push to external FHIR repos



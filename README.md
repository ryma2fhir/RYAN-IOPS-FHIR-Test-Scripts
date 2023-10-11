# IOPS-Validation


This is a typescript module used to test HL7 FHIR resources using [IOPS-FHIR-Validation-Service ](https://github.com/NHSDigital/IOPS-FHIR-Validation-Service)
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

# Simplifier IG Content Checker
This action checks a Simplifier implementation guide for spelling, http errors and invalid links. More information can be found within the [IGPageContentValidator](https://github.com/NHSDigital/IOPS-FHIR-Test-Scripts/tree/main/IGPageContentValidator) folder.

# Quality Control Checker
The action checks the quality of FHIR assets as per the [UK Core](https://simplifier.net/guide/hl7fhirukcoredesignanddevelopmentapproach?version=current) / [NHSE](https://simplifier.net/guide/nhs-england-design-and-development-approach?version=current) Design and Development approach. More infomration can be found within the [QualityControlChecker]https://github.com/NHSDigital/IOPS-FHIR-Test-Scripts/tree/main/QualityControlChecker) folder.

# Ryan's Notes (to be confirmed)
## Examples
The testingbranch.yml creates an action to test the updated validator. These use the folder Examples which are split into examples that should either pass or fail. These examples are tested within the /src/vaidator.test.ts file.

## /src/common.js.ts
This holds the code for converting xml into json, testing assets, and creating or ignoring custom errors.

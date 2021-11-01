# IOPS-Validation

This is a typescript module used to test fhir resources using [validation-service-fhir-r4](https://github.com/NHSDigital/validation-service-fhir-r4)
The configuration and setup of this service is not covered here.

## Prerequisite 

Install [node-js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
Running instance of the `validation-service-fhir-r4`

## Basic Tests

Create a directory for your tests. 
Create a folder for you tests called `Examples`.
Clone this repo `git clone https://github.com/NHSDigital/IOPS-Validation.git`
Run the tests via `npm test`

## Test files in another folder

The test folder can be changed via the `folder` parameter, e.g. 

`npm test -- --folder=../ExamplesTest`

## Implementation Guide Tests

The tests can also be run against a series of folders laid out in a set way. This uses the `path` parameter, e.g. 

`npm test -- --path='../NHSDigital-FHIR-ImplementationGuide/'

This parameter with search for the following sub folders in the supplied path.

- CapabilityStatement

 

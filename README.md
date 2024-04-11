# IOPS-Validation

This is a typescript module used to test HL7 FHIR resources using [IOPS-FHIR-Validation-Service](https://github.com/NHSDigital/IOPS-FHIR-Validation-Service)

Current status of **IOPS-FHIR-Validation-Service** 


[![NHSDigital IOPS Validation)](https://github.com/NHSDigital/IOPS-Validation/actions/workflows/testingbranch.yml/badge.svg)](https://github.com/NHSDigital/IOPS-Validation/actions/workflows/testingbranch.yml)

## Prerequisite 

The following software are required but are preinstalled on the GitHub ubuntu runner:
- [Maven](https://maven.apache.org/)
- [node-js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)


Running instance of the [IOPS-FHIR-Validation-Service](https://github.com/NHSDigital/IOPS-FHIR-Validation-Service)


## Tests

### Basic Tests

Create a directory for your tests. 
Create a folder for you tests called `Examples`.
Clone this repo `git clone git@github.com:NHSDigital/IOPS-FHIR-Test-Scripts.git`
Run the tests via `npm test`

### Test files in another folder

The test folder can be changed via the `examples` parameter, e.g. 

`npm test -- --examples=../ExamplesTest`

### Implementation Guide Tests

The tests can also be run against a series of folders laid out in a set way. This uses the `source` parameter, e.g. 

`npm test -- --source='../NHSDigital-FHIR-ImplementationGuide/`

This parameter with search for the following sub folders in the supplied path.

- CapabilityStatement - **Note: To test against specific profiles, e.g. UK Core, this needs to be present. See UK Core for the [Asset](https://github.com/NHSDigital/FHIR-R4-UKCORE-STAGING-MAIN/blob/develop/CapabilityStatement/CapabilityStatement-UKCore.xml)** 
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

`cd validation && npm start`

Examples of use within a workflow can be found:

- https://github.com/NHSDigital/NHSDigital-FHIR-ImplementationGuide/blob/master/.github/workflows/FHIRValidation.yml
- https://github.com/NHSDigital/NHSDigital-FHIR-Medicines-ImplementationGuide/blob/master/.github/workflows/integration.yml

## Options
It is possible to set the following options within your FHIR repository:  
**strict-validation** - *Boolean (default:false)*: set to true for all warnings to be promoted to errors, false to allow validation to pass with warnings present.  
**igonore-folders** - *list (default:[])*: a list of all folders to ignore that do not contain FHIR resources. All folders starting with `.` will be automatically ignored.  
**igonore-files** - *list (default:[])*: a list of all json or xml files to be ignored. `fhirpkg.lock.json`, `package.json`, `options.json` will be automatically ignored.  
**error-if-metaProfile-present** - *Boolean (default:true)*: [IG best practice](https://build.fhir.org/ig/FHIR/ig-guidance/best-practice.html#examples) states *"Avoid declaring meta.profile in your examples unless there’s an expectation..."*. Setting this attribute to true will cause the validator to error if meta.profile is found within an example.
The file created will need to be named `options.json` and contain the following:
```json
{
    "strict-validation": false,
    "ignore-folders": [],
    "ignore-files": [],
	"error-if-metaProfile-present": true
}
```

**Important**: The `options.json` will need to be excluded within the Simplifier project. See [Simplifier GitHub Integration](https://docs.simplifier.net/projects/Simplifier/data_governance_and_quality_control/simplifierGithub.html#github-include-exclude) for more details.


# Simplifier IG Content Checker
This action checks a Simplifier implementation guide for spelling, http errors and invalid links. More information can be found within the [IGPageContentValidator](https://github.com/NHSDigital/IOPS-FHIR-Test-Scripts/tree/main/IGPageContentValidator) folder.

# Quality Control Checker
The action checks the quality of FHIR assets as per the [UK Core](https://simplifier.net/guide/hl7fhirukcoredesignanddevelopmentapproach?version=current) / [NHSE](https://simplifier.net/guide/nhs-england-design-and-development-approach?version=current) Design and Development approach. More infomration can be found within the [QualityControlChecker]https://github.com/NHSDigital/IOPS-FHIR-Test-Scripts/tree/main/QualityControlChecker) folder.

# Developer Information
## Workflows

### Validation
Package-Test-Runner  
&emsp;Checks NHSE assets for conformance to specific UKCore packages. Useful to find breaking changes when new UKCore packages are created. Works on manual workflow run. Change `packagename` & `packageversion` within the action.  
masterfhirvalidation  
&emsp;Validates FHIR assets to ensure conformance to FHIR and checks examples are valid and all codes within them are correct as per the ontoserver. Works on push from FHIR Repo.  
testingbranch  
&emsp;used to test the latest validator against a test suite (currently in progress)  
validator-test

### Quality Control
**errorChecker** - Checks for html errors in Simplifier IGs. Works on push to this repo  
**linkChecker** - Checks for url errors in Simplifier IGs. Works on push to this repo  
**spellChecker** - Checks for spelling errors in Simplifier IGs. Works on push to this repo  
**QualityControlChecker** - Checks for spelling and conformance of FHIR assets. Works on push to external FHIR repos  


# Ryan's Notes (to be confirmed)
## Examples
The testingbranch.yml creates an action to test the updated validator. These use the folder Examples which are split into examples that should either pass or fail. These examples are tested within the /src/vaidator.test.ts file.

## /src/common.js.ts
This holds the code for converting xml into json, testing assets, and creating or ignoring custom errors.

# Workflows
These are the workflows for the validator actions in a human readble format.

## IOPS-FHIR-Validation-Terminology
**Runs on:**  
&emsp;Push from FHIR repo e.g. FHIR-R4-UKCORE-STAGING-MAIN with ontoserver credentials  
**Check out IOPS-Validation**  
&emsp;Adds IOPS-FHIR-Test-Scripts as folder inside FHIR-R4-UKCORE-STAGING-MAIN folder in the local ubuntu machine.  
**Check out validation-service-fhir-r4**  
&emsp;Adds IOPS-FHIR-Validation-Service as folder inside FHIR-R4-UKCORE-STAGING-MAIN folder in the local ubuntu machine.  
**Install npm**  
&emsp;Install npm in IOPS-FHIR-Test-Scripts folder
**Configure FHIR Validator**  
&emsp;`npm start` in IOPS-FHIR-Test-Scripts folder (configures FHIR validator using ontoserver credentials). The `start` is defined in package.json as "ts-node src/configureValidator.ts"  
**Build FHIR Validator**  
&emsp;Runs `mvn clean install` inside IOPS-FHIR-Test-Scripts  
&emsp;&emsp;Clean: remove target folder  
&emsp;&emsp;Package: Follows the lifecycle phase `validate >> compile >> test (optional) >> package`  
&emsp;&emsp;(for reference `install`: `validate >> compile >> test (optional) >> package >> verify >> install`)  
**Run FHIR Validator**  
&emsp;`nohup java -jar validation-service-fhir-r4/target/fhir-validator.jar --<params>` 
&emsp;`nohup`: no hang up is a command in Linux systems that keep processes running even after exiting the shell or terminal   
&emsp;`java -jar`: run the jar file passing the parameters listed after each `--` 
**Run Test**  
&emsp;Run `npm test` inside IOPS-FHIR-Test-Scripts folder. The `test` is defined in package.json as `jest --runInBand src/validate.test.ts`

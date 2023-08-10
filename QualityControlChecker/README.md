# Quality Control Checker
The validator runs whenever a new push is initated on any branch within the UK Core repo. This validation has been setup not to fail if it finds an incorrect value, so the action must be checked seperately when deemed necessary. 

The validator checks the following:

## Assets
- ### Assets are in the correct folder
- ### NamingSystem elements are correct
This action checks the following elements within [NamingSystem](https://hl7.org/fhir/R4/namingsystem.html) Resource.
- id
- url
- name
- title

These are checked against the filename to ensure that the words within each value align (minus special character such as hypens, spacing, etc.)  
Note: This does not check 'retired' assets. If the url is an R5 backport then this has been set to pass the url check.

## Examples
- ### Examples have the suffix "-Example"
- ### Example id matches file name. This ensures correct and standardised ids whilst ensuring the are unique

## CapabilityStaement
- ### All profiles (not including derived Profiles) are within the CapabilityStatement

## Spell Check
Each .xml file within the GitHub repo is now checked for spelling. this uses Aspell, along with the personal dictionary from the [IGPageContentValidator](https://github.com/NHSDigital/IOPS-FHIR-Test-Scripts/tree/main/IGPageContentValidator) folder. It will check camelCase and any word that has 3 characters or more.


## Workflows Related to this Validator

These are found within .github/workflows
In this repo
- QualityControlCheckerNHSE.yml
- QualityControlCheckerUKCore.yml

In the NHSDigital/FHIR-R4-UKCORE-STAGING-MAIN repo
- QualityControlChecker.yml

In the NHSDigital/NHSEngland-FHIR-ImplementationGuide repo
- QualityControlChecker.yml

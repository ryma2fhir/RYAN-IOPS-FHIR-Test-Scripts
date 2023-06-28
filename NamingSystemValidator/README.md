# NamingSystem Validator
The validator runs whenever a new push is initated on any branch within the UK Core repo. This validation has been setup not to fail if it finds an incorrect value, so the action must be checked seperately when deemed necessary.

The validator checks the following:

### Files are in the correct folder

### NamingSystem elements are correct
This action checks the following elements within [NamingSystem](https://hl7.org/fhir/R4/namingsystem.html) Resource.
- id
- url
- name
- title

These are checked against the filename to ensure that the words within each value align (minus special character such as hypens, spacing, etc.)

### Examples have the suffix "Example"


## Workflows Related to this Validator

These are found within .github/workflows
In this repo
- NamingSystemChecker.yml

In the NHSDigital/FHIR-R4-UKCORE-STAGING-MAIN repo
- UKCoreNamingSystemValidator.yml

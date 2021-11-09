

java -jar validator_cli.jar Examples/fail/Bundle-prescription-order-locationNotPresent.json -version 4.0.1 -tx https://r4.ontoserver.csiro.au/fhir -ig https://packages.simplifier.net/uk.nhsdigital.medicines.r4.test/-/uk.nhsdigital.medicines.r4.test-2.3.4-prerelease.tgz


java -jar validator_cli.jar Examples/fail/Bundle-prescription-order-incorrectFocus.json -tx NOTX -sct 999000041000000102 -version 4.0.1 -ig https://packages.simplifier.net/uk.nhsdigital.medicines.r4.test/-/uk.nhsdigital.medicines.r4.test-2.3.4-prerelease.tgz
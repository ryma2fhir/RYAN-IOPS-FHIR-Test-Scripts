FROM eclipse-temurin:18.0.2

WORKDIR /app

COPY ../validation-service-fhir-r4/target/fhir-validator-*.jar ./fhir-validator.jar
RUN chmod -R a+x /app

USER nobody

#AEA-1024: Setting TEST_SYSTEM_PROP_VALIDATION_RESOURCE_CACHES_MS to max long so our resource cache never expires.
CMD ["java", "-Xms1500m", "-Xmx1500m", "-DTEST_SYSTEM_PROP_VALIDATION_RESOURCE_CACHES_MS=9223372036854775807", "-jar", "fhir-validator.jar"]

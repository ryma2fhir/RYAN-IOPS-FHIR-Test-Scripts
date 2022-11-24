

module.exports = {
    reporters: [
        "default",
        "jest-github-actions-reporter"
    ],
    testLocationInResults: true,
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testRunner : 'jasmine2',
    verbose: true
};


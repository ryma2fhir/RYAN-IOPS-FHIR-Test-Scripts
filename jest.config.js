

module.exports = {
    reporters: [
        "default",
        "jest-github-actions-reporter"
    ],
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testRunner : 'jasmine2',
    verbose: true
};


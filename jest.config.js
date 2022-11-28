

const config = {
    reporters: [
        "default",
        'github-actions',
        '<rootDir>/test-reporter/index.js'
    ],
    testLocationInResults: true,
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    verbose: true
};

module.exports = config;




const config = {
    reporters: [
        "default",
        'github-actions',
        "jest-github-actions-reporter"
    ],
    testLocationInResults: true,
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    verbose: true
};

module.exports = config;


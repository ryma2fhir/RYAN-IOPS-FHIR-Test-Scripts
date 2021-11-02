

module.exports = {
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testRunner : 'jasmine2',
    verbose: true
};

jest.setTimeout(10000)
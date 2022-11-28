const tsNode = require("ts-node");

tsNode.register({
    transpileOnly: true,
    compilerOptions: {
        "module": "commonjs",
        "esModuleInterop": true,
        "target": "es2017",
        "lib": [
            "es2019"
        ],
        "moduleResolution": "node",
        "baseUrl": ".",
    },
});

module.exports = require("./test-reporter");

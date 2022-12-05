import * as fs from "fs";
import path from "path";
import {
    buildCapabilityStatement,
    downloadPackage,
    getJson,
    isDefinition,
    isIgnoreFolder,
    processYAMLfile
} from "./common.js";
import { tar } from 'zip-a-folder';
import * as console from "console";


const jsonminify = require("jsonminify");
let fileName = 'package.json';
    let source = '../'
    let destination = '../../'

    const args = require('minimist')(process.argv.slice(2))

    let destinationPath = 'validation-service-fhir-r4/src/main/resources';


let ontoServer: string = 'https://ontology.nhs.uk/authoring/fhir/';
if (process.env.ONTO_URL != undefined) {
        ontoServer = process.env.ONTO_URL;
    }
    if (args != undefined) {
        if (args['source'] != undefined) {
            source = args['source'];
        }
        if (args['destination'] != undefined) {
            destination = args['destination'];
        }
    }


    destinationPath = destination + destinationPath
    console.info('Destination - ' + destinationPath)
    console.info('Current directory - ' + __dirname)

    const workerDir = __dirname;

    class TarMe {
        static async main(src, destination) {
            await tar(src, destination);
        }
    }

    // update manifest file if source supplied, skip otherwise
    let manifest = [];


    fileName = source + fileName

    const packageName: string = process.env.PACKAGE_NAME;
    const packageVersion: string = process.env.PACKAGE_VERSION;

    if (packageName != undefined && packageVersion != undefined) {
        // Extract FHIR from OAS
        processFolderOAS(source, source);

        console.info('Configuring manifest for ' + packageName + ' ' + packageVersion)
        manifest.push({
            "packageName": packageName,
            "version": packageVersion
        })
        fs.writeFile(path.join(workerDir, '../validation-service-fhir-r4/src/main/resources' + '/manifest.json'), JSON.stringify(manifest, null, 2), function (err) {
            if (err) {
                return console.error(err);
            }
        });



        // process OAS files and extract FHIR Examples?
        function processFolderOAS(dir : string, source: string) {
        //    console.info(dir)
            if (fs.existsSync(dir)) {
                processFolderContentOAS(dir,source)
            }
        }

        function processFolderContentOAS(dir : string, source: string) {
          //  console.info('Process folder: '+dir)
            const list = fs.readdirSync(dir);
            list.forEach(function (file) {
                if (fs.lstatSync(dir +'/'+file).isDirectory()) {
                    if (!isIgnoreFolder(file)) processFolderOAS(dir+ "/" + file, source)
                } else {
                    if (file.toUpperCase().endsWith('YAML') || file.toUpperCase().endsWith('YML')) {

                        processYAMLfile(dir, file)

                    }
                }
            })
        }




    } else
    if (fs.existsSync(fileName)) {
        const file = fs.readFileSync(fileName, 'utf-8');
        const pkg = JSON.parse(file);
        pkg.version = '0.0.0-prerelease';

        if (pkg.dependencies != undefined) {
            for (let key in pkg.dependencies) {
                if (key != 'hl7.fhir.r4.core') {
                    const entry = {
                        "packageName": key,
                        "version": pkg.dependencies[key]
                    };
                    console.info('Using package ' + key + '-' + pkg.dependencies[key])

                   // downloadPackage(destinationPath, key, pkg.dependencies[key]);
                    manifest.push(entry);
                }
            }
            console.info('Adding manifest entry for ' + pkg.name)
            manifest.push({
                "packageName": pkg.name,
                "version": pkg.version
            })
            // Ensure temp dir is empty
            console.info('Current directory - ' + __dirname)
            try {
                fs.rmdirSync(path.join(workerDir, '../temp'), {recursive: true});
            } catch (error) {
                // do nothing
                console.info('clean up - directory did not exist')
            }
            // new version fs.rmSync(path.join(__dirname, '../temp'), { recursive: true, force: true });

            fs.mkdirSync(path.join(workerDir, '../temp/package/examples'), {recursive: true});
            fs.mkdirSync(path.join(workerDir, destinationPath), {recursive: true});
            fs.writeFile(path.join(workerDir, destinationPath + '/manifest.json'), JSON.stringify(manifest, null, 2), function (err) {
                if (err) {
                    return console.error(err);
                }
            });
            console.info(JSON.stringify(pkg))
            fs.writeFile('temp/package/package.json', JSON.stringify(pkg, null, 2), function (err) {
                if (err) {
                    return console.error(err);
                }
            });
            const list = fs.readdirSync(source);
            list.forEach(function (fileName) {
                if (!isIgnoreFolder(fileName)) {
                    if (fs.lstatSync(source + fileName).isDirectory()) {
                        if (isDefinition(fileName)) {
                            copyFolder(source + fileName);
                        } else {
                            copyExamplesFolder(source + fileName);
                        }
                    }
                }
            });

            console.info('Creating temporary package ' + pkg.name + '-' + pkg.version);
            console.info('Deleting temporary files');
            deleteFile('temp/package/.DS_Store.json');
            deleteFile('temp/package/examples/.DS_Store.json');

            TarMe.main(path.join(__dirname, '../temp'), path.join(__dirname, destinationPath + '/' + pkg.name + '-' + pkg.version + '.tgz'))
                .then(function () {
                });

        }
    } else {
        const manifestFile = path.join(workerDir, destinationPath + '/manifest.json');
        if (fs.existsSync(manifestFile)) {
            console.info("Reading manifest file");
            const file = fs.readFileSync(manifestFile, 'utf-8');
            manifest = JSON.parse(file);
            for (let index in manifest) {

                if (manifest[index].packageName != 'hl7.fhir.r4.core') {
                    const entry = manifest[index];
                    console.info('Using package ' + entry.packageName + '-' + entry.version)
                    downloadPackage(destinationPath, entry.packageName, entry.version);
                }
            }
        } else {

                console.info(manifest);
                console.info("Error - No source package.json or validator manifest.json found");

        }
    }

    function deleteFile(file) {
        fs.stat(file, function (err) {
            //console.info(stats);//here we got all information of file in stats variable
            if (err) {
                //return console.error(err);
            }
            fs.unlink(file, function (err) {
                if (err) {
                    return;
                }
                console.info('file deleted successfully ' + file);
            });
        });
    }


    function copyExamplesFolder(dir) {

        console.info('Processing Examples Folder ' + dir);
        if (fs.existsSync(dir)) {

            const list = fs.readdirSync(dir);
            list.forEach(function (file) {
                if (!file.startsWith(".")) {
                    let ext: string = path.extname(file)
                    let root: string = file.substring(0, file.length - ext.length)
                    let destination = 'temp/package/examples/' + root + '.json';

                    const resource: any = fs.readFileSync(dir + "/" + file, 'utf8');
                    // TODO This may not be 100% - if we can use XML in packages we should do
                    const json = getJson(file, resource);
                    fs.writeFile(destination, jsonminify(json), function (err) {
                        if (err) {
                            return console.error(err);
                        }
                    });
                }
            })
        } else {
            console.info('INFO Folder not found  ' + dir);
        }
    }

    function copyFolder(dir) {

        console.info('Processing Definition Folder ' + dir);
        if (fs.existsSync(dir)) {

            const list = fs.readdirSync(dir);
            list.forEach(function (file) {
                let ext: string = path.extname(file)
                let root: string = file.substring(0, file.length - ext.length)
                let destination = 'temp/package/' + root + '.json';
                if (dir.includes('MessageDefinition') || dir.includes('ObservationDefinition')) {
                    destination = 'temp/package/examples/' + root + '.json';
                }

                const resource: any = fs.readFileSync(dir + "/" + file, 'utf8');
                const json = getJson(file, resource);
                fs.writeFile(destination, jsonminify(json), function (err) {
                    if (err) {
                        return console.error(err);
                    }
                });
            })
        } else {
            console.info('INFO Folder not found  ' + dir);
        }
    }

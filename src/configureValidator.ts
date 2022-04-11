import * as fs from "fs";
import path from "path";
import { downloadPackage, getJson, resourceChecks } from "./common.js";
import { tar } from 'zip-a-folder';


var jsonminify = require("jsonminify");
let fileName = 'package.json';
let source = '../'
let destination = '../../'

const args = require('minimist')(process.argv.slice(2))

let destinationPath = 'validation-service-fhir-r4/src/main/resources';


var ontoServer: string = 'https://ontology.nhs.uk/authoring/fhir/'
if (process.env.ONTO_URL != undefined) {
    ontoServer = process.env.ONTO_URL;
}
var clientId: string = process.env.ONTO_CLIENT_ID
var clientSecret: string = process.env.ONTO_CLIENT_SECRET

if (args != undefined) {
    if (args['source'] != undefined) {
        source = args['source'];
    }
    if (args['destination'] != undefined) {
        destination = args['destination'];
    }
}


destinationPath = destination + destinationPath
console.log('Destination - ' + destinationPath)
console.log('Current directory - ' + __dirname)
var workerDir = __dirname

class TarMe {
    static async main(src, destination) {
        await tar(src, destination);
    }
}

// update manifest file if source supplied, skip otherwise
var manifest = [];


    fileName = source + fileName

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
                    console.log('Using package ' + key + '-' + pkg.dependencies[key])

                    downloadPackage(destinationPath, key, pkg.dependencies[key]);
                    manifest.push(entry);
                }
            }
            console.log('Adding manifest entry for ' + pkg.name)
            manifest.push({
                "packageName": pkg.name,
                "version": pkg.version
            })
            // Ensure temp dir is empty
            console.log('Current directory - ' + __dirname)
            try {
                fs.rmdirSync(path.join(workerDir, '../temp'), {recursive: true});
            } catch (error) {
                // do nothing
                console.log('clean up - directory did not exist')
            }
            // new version fs.rmSync(path.join(__dirname, '../temp'), { recursive: true, force: true });

            fs.mkdirSync(path.join(workerDir, '../temp/package/examples'), {recursive: true});
            fs.mkdirSync(path.join(workerDir, destinationPath), {recursive: true});
            fs.writeFile(path.join(workerDir, destinationPath + '/manifest.json'), JSON.stringify(manifest, null, 2), function (err) {
                if (err) {
                    return console.error(err);
                }
            });
            console.log(JSON.stringify(pkg))
            fs.writeFile('temp/package/package.json', JSON.stringify(pkg, null, 2), function (err) {
                if (err) {
                    return console.error(err);
                }
            });


            copyFolder(source + 'CapabilityStatement');

            copyFolder(source + 'ConceptMap');

            copyFolder(source + 'CodeSystem');

            copyFolder(source + 'MessageDefinition');

            copyFolder(source + 'NamingSystem');

            copyFolder(source + 'ObservationDefinition');

            copyFolder(source + 'OperationDefinition');

            copyFolder(source + 'Questionnaire');

            copyFolder(source + 'SearchParameter');

            copyFolder(source + 'StructureDefinition');

            copyFolder(source + 'ValueSet');

            copyFolder(source + 'StructureMap');

            // Begin UK Core folder names

            copyFolder(source + 'codesystems');
            copyFolder(source + 'conceptmaps');
            copyFolder(source + 'structuredefinitions');
            copyFolder(source + 'valuesets');

            // End UK Core folder names


            console.log('Creating temporary package ' + pkg.name + '-' + pkg.version);
            console.log('Deleting temporary files');
            deleteFile('temp/package/.DS_Store.json');
            deleteFile('temp/package/examples/.DS_Store.json');

            TarMe.main(path.join(__dirname, '../temp'), path.join(__dirname, destinationPath + '/' + pkg.name + '-' + pkg.version + '.tgz'));

        }
    } else {
        var manifestFile = path.join(workerDir, destinationPath + '/manifest.json');
        if (fs.existsSync(manifestFile)) {
            console.log("Reading manifest file");
            const file = fs.readFileSync(manifestFile, 'utf-8');
            manifest = JSON.parse(file);
            for (let index in manifest) {

                if (manifest[index].packageName != 'hl7.fhir.r4.core') {
                    const entry = manifest[index];
                    console.log('Using package ' + entry.packageName + '-' + entry.version)
                    downloadPackage(destinationPath, entry.packageName, entry.version);
                }
            }
        } else {
            console.log(manifest);
            console.log("Error - No source package.json or validator manifest.json found");
        }
    }

function deleteFile(file) {
    fs.stat(file, function (err, stats) {
        //console.log(stats);//here we got all information of file in stats variable
        if (err) {
            //return console.error(err);
        }
        fs.unlink(file, function (err) {
            if (err) {
                return;
            }
            console.log('file deleted successfully ' + file);
        });
    });
}



function copyFolder(dir) {

    console.log('Processing ' + dir);
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
        console.log('INFO Folder not found  ' + dir);
    }
}

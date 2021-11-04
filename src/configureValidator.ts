import * as fs from "fs";
import path from "path";
import {downloadPackage, getJson, resourceChecks} from "./common.js";
import { tar } from 'zip-a-folder';


var jsonminify = require("jsonminify");
const fileName = '../package.json';

const args = require('minimist')(process.argv.slice(2))

const destinationPath = '../../validation-service-fhir-r4/src/main/resources';


var ontoServer: string = 'https://ontology.nhs.uk/authoring/fhir/'
if (process.env.ONTO_URL!= undefined) {
    ontoServer = process.env.ONTO_URL;
}
var clientId: string = process.env.ONTO_CLIENT_ID
var clientSecret: string = process.env.ONTO_CLIENT_SECRET


class TarMe {
    static async main(src, destination) {
        await tar(src, destination);
    }
}

if (clientId != undefined && clientSecret != undefined) {
    console.log('Configuring NHS Onto Server connection')
    console.log('Using ' + ontoServer)
    var config = {
        "terminologyServer": ontoServer,
        "useRemoteTerminology" : true,
        "clientId" : clientId,
        "clientSecret": clientSecret
    }
    fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
    fs.writeFile(path.join(__dirname,destinationPath + '/validation.json'), JSON.stringify(config),  function(err) {
        if (err) {
            return console.error(err);
        }
    });
}


if (fs.existsSync(fileName)) {
    const file = fs.readFileSync(fileName, 'utf-8');
    const pkg = JSON.parse(file);
    pkg.version = '0.0.0-prerelease';
    var manifest = [
        {
            "packageName": pkg.name,
            "version": pkg.version
        }
    ];
    if (pkg.dependencies != undefined) {
        for( let key in pkg.dependencies) {
            if (key != 'hl7.fhir.r4.core') {
                const entry = {
                    "packageName": key,
                    "version": pkg.dependencies[key]
                };
                console.log('Using package '+ key + '-' + pkg.dependencies[key])

                downloadPackage(destinationPath,key,pkg.dependencies[key] );
                manifest.push(entry);
            }
        }

        fs.mkdirSync(path.join(__dirname, '../temp/package/examples'),{ recursive: true });
        fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
        fs.writeFile(path.join(__dirname,destinationPath + '/manifest.json'), JSON.stringify(manifest),  function(err) {
            if (err) {
                return console.error(err);
            }
        });
        console.log(JSON.stringify(pkg))
        fs.writeFile('temp/package/package.json', JSON.stringify(pkg),  function(err) {
            if (err) {
                return console.error(err);
            }
        });


        copyFolder('../CapabilityStatement');

        copyFolder('../ConceptMap');

        copyFolder('../CodeSystem');

        copyFolder('../MessageDefinition');

        copyFolder('../NamingSystem');

        copyFolder('../ObservationDefinition');

        copyFolder('../OperationDefinition');

        copyFolder('../Questionnaire');

        copyFolder('../SearchParameter');

        copyFolder('../StructureDefinition');

        copyFolder('../ValueSet');

        // Begin UK Core folder names

        copyFolder('../codesystems');
        copyFolder('../conceptmaps');
        copyFolder('../structuredefinitions');
        copyFolder('../valuesets');

        // End UK Core folder names


        console.log('Creating temporary package ' + pkg.name +'-' + pkg.version);
        console.log('Deleting temporary files');
        deleteFile('temp/package/.DS_Store.json');
        deleteFile('temp/package/examples/.DS_Store.json');
        TarMe.main(path.join(__dirname, '../temp'),path.join(__dirname,destinationPath + '/' + pkg.name +'-' + pkg.version + '.tgz' ));

    }
}

function deleteFile(file) {
    fs.stat(file, function (err, stats) {
        //console.log(stats);//here we got all information of file in stats variable
        if (err) {
            //return console.error(err);
        }
        fs.unlink(file,function(err){
            if(err) {
                return;
            }
            console.log('file deleted successfully ' + file);
        });
    });
}



function copyFolder(dir) {

    console.log('Processing '+dir);
    if (fs.existsSync(dir)) {

        const list = fs.readdirSync(dir);
        list.forEach(function (file) {

            let ext: string = path.extname(file)
            let root: string = file.substring(0, file.length - ext.length)
            let destination = 'temp/package/' + root + '.json';
            if (dir == '../MessageDefinition' || dir == '../ObservationDefinition') {
                destination = 'temp/package/examples/' + root + '.json';
            }
            file = dir + "/" + file;
            const resource: any = fs.readFileSync(dir + "/" + file, 'utf8');
            const json = getJson(file,resource);
            fs.writeFile(destination, jsonminify(json),  function(err) {
                if (err) {
                    return console.error(err);
                }
            });
        })
    } else {
        console.log('INFO Folder not found  '+dir);
    }
}

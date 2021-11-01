import * as fs from "fs";
import path from "path";
import {getJson, resourceChecks} from "./common.js";
import { tar } from 'zip-a-folder';
import axios from "axios";



var jsonminify = require("jsonminify");
const fileNamw = '../package.json';

const destinationPath = '../../validation-service-fhir-r4/src/main/resources';

class TarMe {
    static async main(src, destination) {
        await tar(src, destination);
    }
}

if (fs.existsSync(fileNamw)) {
    const file = fs.readFileSync(fileNamw, 'utf-8');
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

                downloadPackage(key,pkg.dependencies[key] );
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

async function downloadPackage(name,version ) {
    const url = 'https://packages.simplifier.net/' + name + '/' + version;
    console.log('Download from ' + url);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        // @ts-ignore
        const buffer = Buffer.from(response.data, 'binary');

        fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
        fs.writeFileSync(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), buffer);
        console.log('Updated dependency ' + url);
    } catch (exception) {
        process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
        throw new Error('Unable to download package '+url);
    }
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

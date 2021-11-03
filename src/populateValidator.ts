
import axios from "axios";
import {URLSearchParams} from "url";
import fs from "fs";
import path from "path";
import {getJson, resourceChecks} from "./common.js";



const fileName = '../package.json';

const decompress = require('decompress');

const args = require('minimist')(process.argv.slice(2))

var accessToken: String

var ontoServer = 'https://ontology.nhs.uk/authoring/fhir'

if (process.env.ONTO_CLIENT_ID!= undefined) {
    ontoServer = process.env.ONTO_CLIENT_ID;
}
var clientId: string //process.env.ONTO_CLIENT_ID
var clientSecret: string //process.env.ONTO_CLIENT_SECRET

const destinationPath = '/';


    if (clientId != undefined && clientSecret != undefined) {
        console.log('Configuring NHS Onto Server connection')
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        axios.post('https://ontology.nhs.uk/authorisation/auth/realms/nhs-digital-terminology/protocol/openid-connect/token',
            params.toString()).then(response => {
            const data: any = response.data
            console.log(data.access_token)
            accessToken = data.access_token
            processPackages()
        },err =>{
            console.log('oops')
            console.log(err)
        })
    }

    function processPackages() {
        if (fs.existsSync(fileName)) {
            const file = fs.readFileSync(fileName, 'utf-8');
            const pkg = JSON.parse(file);

            if (pkg.dependencies != undefined) {
                for( let key in pkg.dependencies) {
                    console.log('Using package '+ key + '-' + pkg.dependencies[key])
                    dldPackage(destinationPath,key,pkg.dependencies[key] );

                }
            }
        }
    }

async function dldPackage(destinationPath, name,version ) {
    const url = 'https://packages.simplifier.net/' + name + '/' + version;
    console.log('Download from ' + url);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        // @ts-ignore
        const buffer = Buffer.from(response.data, 'binary');

        fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
        await fs.writeFileSync(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), buffer);
        decompress(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), path.join(__dirname,destinationPath + '/' + name +'-' + version)).then(files => {
            processPkg(path.join(__dirname,destinationPath + '/' + name +'-' + version + '/package'))
        });

    } catch (exception) {
        process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
        throw new Error('Unable to download package '+url);
    }
}

function processPkg( dir) {

    if (fs.existsSync(dir)) {
        const list = fs.readdirSync(dir);
        list.forEach(function (file) {
            if (file.includes('.DS_Store')) return;
            if (file.includes('examples')) return;
            file = dir + "/" + file;
            const data: any = fs.readFileSync(file, 'utf8');

            const resource = JSON.parse(getJson(file,data))

            if (resource.resourceType =='CodeSystem') {
                console.log('Processing CodeSystem '+  resource.url);

                axios.get(ontoServer + '/CodeSystem?url=' + resource.url, {
                    headers: {
                        'Authorization': 'Bearer '+accessToken
                    }
                }).then( response => {
                    const bundle: any = response.data

                    // @ts-ignore
                    if (bundle.resourceType == 'Bundle')
                        if ((bundle.entry == undefined || bundle.entry.length == 0 )) {
                            console.log('Posting CodeSystem '+  resource.url);
                            axios.post(ontoServer + '/CodeSystem', resource, {
                                headers: {
                                    'Authorization': 'Bearer ' + accessToken
                                }
                            }).then(result => {
                                console.log('Updated - ' + resource.url)
                            }, err => {
                                console.log('Error - ' + resource.url)
                            })

                        } else {
                            if (bundle.entry != undefined && bundle.entry.length > 1) console.log('WARN ' + resource.url + ' = ' + bundle.entry.length )
                        }
                })
            }
            if (resource.resourceType =='ValueSet') {
                console.log('Processing ValueSet '+  resource.url);

                axios.get(ontoServer + '/ValueSet?url=' + resource.url, {
                    headers: {
                        'Authorization': 'Bearer '+accessToken
                    }
                }).then( response => {
                    const bundle: any = response.data

                    // @ts-ignore
                    if (bundle.resourceType == 'Bundle')
                        if ((bundle.entry == undefined || bundle.entry.length == 0 )) {
                            console.log('Posting ValueSet '+  resource.url);
                            axios.post(ontoServer + '/ValueSet', resource, {
                                headers: {
                                    'Authorization': 'Bearer ' + accessToken
                                }
                            }).then(result => {
                                console.log('Updated - ' + resource.url)
                            }, err => {
                                console.log('Error - ' + resource.url)
                            })

                        } else {
                            if (bundle.entry != undefined && bundle.entry.length > 1) console.log('WARN ' + resource.url + ' = ' + bundle.entry.length )
                        }
                })
            }
        })
    }

}

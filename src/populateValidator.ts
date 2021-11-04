
import axios from "axios";
import {URLSearchParams} from "url";
import fs from "fs";
import path from "path";
import {delay, getJson, resourceChecks, wait} from "./common.js";
import {err} from "pino-std-serializers";



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
var fileNo = 0;
var postNo = 0;
const destinationPath = '/';

if (args!= undefined) {
    if (args['clientId']!= undefined) {
        clientId = args['clientId'];
    }
    if (args['clientSecret']!= undefined) {
        clientSecret = args['clientSecret'];
    }
}

    if (clientId != undefined && clientSecret != undefined) {
        console.log('Configuring NHS Onto Server connection')
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        axios.post('https://ontology.nhs.uk/authorisation/auth/realms/nhs-digital-terminology/protocol/openid-connect/token',
            params.toString()).then(response => {
            const data: any = response.data
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

        await fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
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
                checkResource(resource)
            }
            if (resource.resourceType =='ValueSet') {
                checkResource(resource)
            }
        })
    }
}


async function  checkResource(resource : any) {
    fileNo++
    // throttle requests
    var localFiledNo = fileNo
    await delay( fileNo * 50)
    console.log(localFiledNo + ' - Checking '+ resource.resourceType + ' url ' + resource.url);
    await axios.get(ontoServer + '/'+resource.resourceType+'?url=' + resource.url, {
        headers: {
            'Authorization': 'Bearer '+accessToken
        }
    }).then( response => {
        const bundle: any = response.data

        if (bundle.resourceType == 'Bundle')
            if ((bundle.entry == undefined || bundle.entry.length == 0 )) {
                console.log(localFiledNo + ' - Not found, adding ' + resource.url)
                postResource(localFiledNo, resource)
            } else {
                console.log(localFiledNo + ' - Found ' + resource.url)
                if (bundle.entry != undefined && bundle.entry.length > 1) console.log('WARN ' + resource.url + ' = ' + bundle.entry.length )
            }
    },
        error => {
            console.log(localFiledNo + ' - Search failed for '+ resource.resourceType + ' url=' + resource.url + ' failed with ' + error.message)
            //console.log(error)
        }
        )
}
    async function postResource(localFileNo, resource) {

        // start 2 seconds after query
        postNo++;
        const localPostNo = postNo
        await delay(500*postNo)
        console.log(localFileNo + '-'+ localPostNo +' Posting '+  resource.url);
        await axios.post(ontoServer + '/'+resource.resourceType, resource, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        }).then(result => {
            console.log(localFileNo + ' - Posted - ' + resource.url)
        }, err => {
            console.log(localFileNo + ' - Post for ' + resource.url + ' failed with ' + err.message)
            if (err.data != undefined) console.log(err.data)

        })
    }

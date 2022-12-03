
import axios from "axios";
import {URLSearchParams} from "url";
import fs from "fs";
import path from "path";
import {delay, getJson} from "./common.js";

const fileName = '../package.json';

const decompress = require('decompress');

const args = require('minimist')(process.argv.slice(2))

const readThrottle = 10
const postThrottle = 500

let accessToken: String;

let ontoServer = 'https://ontology.nhs.uk/authoring/fhir';

if (process.env.ONTO_CLIENT_ID!= undefined) {
    ontoServer = process.env.ONTO_CLIENT_ID;
}
let clientId: string; //process.env.ONTO_CLIENT_ID
let clientSecret: string; //process.env.ONTO_CLIENT_SECRET
let fileNo = 0;
let postNo = 0;
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
        console.info('Configuring NHS Onto Server connection')
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
            console.error(err)
        })
    }

    function processPackages() {
        if (fs.existsSync(fileName)) {
            const file = fs.readFileSync(fileName, 'utf-8');
            const pkg = JSON.parse(file);

            if (pkg.dependencies != undefined) {
                for( let key in pkg.dependencies) {
                    console.info('Using package '+ key + '-' + pkg.dependencies[key])
                    dldPackage(destinationPath,key,pkg.dependencies[key] );

                }
            }
        }
    }

async function dldPackage(destinationPath, name,version ) {
    const url = 'https://packages.simplifier.net/' + name + '/' + version;
    console.info('Download from ' + url);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        // @ts-ignore
        const buffer = Buffer.from(response.data, 'binary');

        fs.mkdirSync(path.join(__dirname,destinationPath ),{ recursive: true });
        fs.writeFileSync(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), buffer);
        decompress(path.join(__dirname,destinationPath + '/' + name +'-' + version + '.tgz'), path.join(__dirname,destinationPath + '/' + name +'-' + version)).then(() => {
            const dir = path.join(__dirname,destinationPath + '/' + name +'-' + version + '/package')
            if (fs.existsSync(dir)) {
                processPkg(dir)
            }
        });

    } catch (exception) {
        process.stderr.write(`ERROR received from ${url}: ${exception}\n`);
        throw new Error('Unable to download package '+url);
    }
}

async function processPkg( dir) {


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


async function  checkResource(resource : any) {
    fileNo++
    // throttle requests
    const localFiledNo = fileNo;
    await delay( fileNo * readThrottle)
    console.info(localFiledNo + ' - Checking '+ resource.resourceType + ' url ' + resource.url);
    await axios.get(ontoServer + '/'+resource.resourceType+'?url=' + resource.url, {
        headers: {
            'Authorization': 'Bearer '+accessToken
        }
    }).then( response => {
        const bundle: any = response.data

        if (bundle.resourceType == 'Bundle')
            if ((bundle.entry == undefined || bundle.entry.length == 0 )) {
                console.info(localFiledNo + ' - Not found, adding ' + resource.url)
                postResource(localFiledNo, resource)
            } else {
                console.info(localFiledNo + ' - Found ' + resource.url)
                if (bundle.entry.length > 1) console.info('WARN ' + resource.url + ' = ' + bundle.entry.length )
            }
    },
        error => {
            console.info(localFiledNo + ' - Search failed for '+ resource.resourceType + ' url=' + resource.url + ' failed with ' + error.message)
            //console.info(error)
        }
        )
}
    async function postResource(localFileNo, resource) {

        // start 2 seconds after query
        postNo++;
        const localPostNo = postNo
        await delay(postThrottle * postNo)
        console.info(localFileNo + '-'+ localPostNo +' Posting '+  resource.url);
        await axios.post(ontoServer + '/'+resource.resourceType, resource, {
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        }).then(() => {
            console.info(localFileNo + '-'+ localPostNo+ ' - Posted - ' + resource.url)
        }, err => {
            console.info(localFileNo + '-'+ localPostNo+ ' - Post for ' + resource.url + ' failed with ' + err.message)
            if (err.data != undefined) console.info(err.data)

        })
    }

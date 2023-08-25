'''A Quality Control Checker for the FHIR-R4-UKCORE-STAGING-MAIN repo, which runs whenever tere is a push to any branch. 

This checks the following:
- XML code for errors
- Files are in the correct path
- Certain elements are present and have correct vales as per the UK Core requirments
- Draft / Active Profiles are within the CapabilityStatement

If any of these are deemed incorrect the workflow will fail. '''

import xml.etree.ElementTree as ET
import os
import sys

error=False #used to fail action if any errors found

paths = ['structuredefinitions','valuesets','codesystems']
currentProfiles = [] #Used for checking against CapbilityStatement
for path in paths:
    files = os.listdir('./'+path)
    print(path)
    for file in files:
        '''open file to find element values'''
        try:
            tree = ET.parse("./"+path+"/"+file)
        except ET.ParseError as e:
            print("\t",file,"- The XML code has an error that needs to be fixed before it can be chcked:",e)
            error=True
            continue
        root = tree.getroot()
        
        '''do not check retired assets'''
        try:
            if root.findall('.//{*}'+str('status'))[0].get('value') == 'retired':
                continue
        except IndexError:
            print("\t",file," - The element 'status' is missing")
        except:
            print("active",root.findall('.//{*}'+str('status'))[0].get('value'))

        
        '''Check files are in correct folder '''
        if path == 'structuredefinitions':
            if file.endswith("Example.xml") or (not file.startswith('Extension') and not file.startswith('UKCore')):
                print("\t",file," - The file has either an incorrect prefix or in the wrong folder '"+path+"'")
                error=True
                continue
            if file.startswith('UKCore'): #Used for Capabilitystatement Checking
                profile = file.replace('.xml','')
                profile = profile.replace('UKCore-','')
                if '-' not in profile: #ignore derived profiles
                    currentProfiles.append(profile)
                    
        if path == 'valuesets' and not file.startswith('ValueSet'):
            print("\t",file," - The file has either an incorrect prefix or in the wrong folder '"+path+"'")
            error=True
            continue
        if path == 'codesystems' and not file.startswith('CodeSystem'):
            print("\t",file," - The file has either an incorrect prefix or in the wrong folder '"+path+"'")
            error=True
            continue
            

        '''check for missing elements'''
        stop = 0
        elements = {'id':'id','url':'url','name':'name','title':'title','version':'version','status':'status','date':'date','description':'description','copyright':'copyright'}
        for key,value in elements.items():
            try:
                elements[key]=(root.findall('.//{*}'+str(key))[0].get('value')) 
            except:
                print("\t",file," - The element '"+key+"' is missing")
                error=True
                stop = 1
        if stop == 1:
            continue
        assets = {"valuesets":"ValueSet","codesystems":"CodeSystem","structuredefinitions":"StructureDefinition"}    
        '''check elements naming convention are correct'''
        fileName = file.replace('.xml','')
        warnings = []
        if path == 'codesystems' or path == 'valuesets':
            fileName = '-'.join(fileName.split('-')[1:])
        if not fileName == elements['id']:
            warnings.append("\t\t"+elements['id']+" - the 'id' is incorrect")
        if not elements['url'].startswith('http://hl7.org/fhir/5.0/'): #passes any R5 extensions
            if not fileName == elements['url'].split('/')[-1]:
                warnings.append("\t\t"+elements['url']+" - The 'url' element is incorrect")
            if not elements['url'].startswith('https://fhir.hl7.org.uk/'+assets[path]):
                warnings.append("\t\t"+elements['url']+" - The 'url' element prefix is incorrect")
        if not ''.join(fileName.split('-')) == elements['name'].split('/')[-1]:
            warnings.append("\t\t"+elements['name']+" - The 'name' element is incorrect")
        if not fileName.replace('-','') == elements['title'].replace(' ',''):
            warnings.append("\t\t"+elements['title']+" - The 'title' element is incorrect")
        if not elements['copyright'] == 'Copyright © 2021+ HL7 UK Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at  http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License. HL7® FHIR® standard Copyright © 2011+ HL7 The HL7® FHIR® standard is used under the FHIR license. You may obtain a copy of the FHIR license at  https://www.hl7.org/fhir/license.html.':
            warnings.append("\t\tThe copyright is incorrect")
        if warnings:
            error=True
            print("\t",file)
            for x in warnings:
                print(x)
                
        ''' Check purpose element is present in Profiles and Extensions '''
        if path == 'structuredefinitions':
            try:
                root.findall('.//{*}'+str('purpose'))[0].get('value')
            except:
                error=True
                print("\t\tpurpose - This element is missing'")
        
                
        ''' Check Contact Details '''
        try:
            if not root.findall('.//{*}'+str('name'))[1].get('value') == 'HL7 UK':
                error=True
                print("\t\tcontact.name - This SHALL be 'HL7 UK'")
        except:
            error=True
            print("\t\tcontact.name - This element is missing")
    
        contact = {'system':'email','value':'ukcore@hl7.org.uk','use':'work','rank':'1'}
        for key,value in contact.items():
            try:
                if not root.findall('.//{*}'+str(key))[0].get('value') == value:
                    error=True
                    print("\t\tcontact.telecom."+key+" - This SHALL be "+value)
            except:
                error=True
                print("\t\tcontact.telecom."+key+" - This element is missing")
                


'''check example filenames'''
examplesPath = os.listdir('./examples')
print('examples')
for example in examplesPath:
    if not example.endswith("-Example.xml"):
        error=True
        print("\t",example," - The filename is does not have the suffix '-Example'")
    '''open file to find element values'''
    tree = ET.parse("./examples/"+example)
    root = tree.getroot()
    if not root.findall('.//{*}id')[0].get('value') == example.replace('.xml',''):
        error=True
        print("\t",example,"The 'id' element is incorrect")

'''Capabilitystatement Checker - checks if all s are in the CapabilityStatement'''
tree= ET.parse('./CapabilityStatement/CapabilityStatement-UKCore.xml')
root = tree.getroot()

print('CapabilityStatement')
capabilityStatement = []
for tag in root.findall('.//{*}type'):
    capabilityStatement.append(tag.attrib["value"])

for p in currentProfiles:
    if p not in capabilityStatement:
        error=True
        print("\t",p,"is missing from the CapabilityStatement")

if error == True:
    print("\nPlease fix the errors found above")
    sys.exit(2)
else:
    print("\n\nCheck Complete!")

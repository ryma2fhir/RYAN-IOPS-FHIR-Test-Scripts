import xml.etree.ElementTree as ET
import os

paths = ['structuredefinitions','valuesets','codesystems']
currentProfiles = [] #Used for checking against CapbilityStatement
for path in paths:
    files = os.listdir('./'+path)
    print(path)
    for file in files:
        '''open file to find element values'''
        tree = ET.parse("./"+path+"/"+file)
        root = tree.getroot()
        
        '''do not check retired assets'''
        try:
            if root.findall('.//{*}'+str('status'))[0].get('value') == 'retired':
                continue
        except:
            print("active",root.findall('.//{*}'+str('status'))[0].get('value'))

        
        '''Check files are in correct folder '''
        if path == 'structuredefinitions':
            if file.endswith("Example.xml") or (not file.startswith('Extension') and not file.startswith('UKCore')):
                print("\t",file," - The file has either an incorrect prefix or in the wrong folder '"+path+"'")
                continue
            if file.startswith('UKCore'): #Used for Capabilitystatement Checking
                profile = file.replace('.xml','')
                profile = profile.replace('UKCore-','')
                if '-' not in profile: #ignore derived profiles
                    currentProfiles.append(profile)
                    
        if path == 'valuesets' and not file.startswith('ValueSet'):
            print("\t",file," - The file has either an incorrect prefix or in the wrong folder '"+path+"'")
            continue
        if path == 'codesystems' and not file.startswith('CodeSystem'):
            print("\t",file," - The file has either an incorrect prefix or in the wrong folder '"+path+"'")
            continue
        stop = 0
        '''check for missing elements'''
        elements = {'ID':'id','url':'url','name':'name','title':'title'}
        for key,value in elements.items():
            try:
                elements[key]=(root.findall('.//{*}'+str(value))[0].get('value')) 
            except:
                print("\t",file," - The element '"+key+"' is missing")
                stop = 1
        if stop == 1:
            continue
            
        '''check elements naming convention are correct'''
        fileName = file.replace('.xml','')
        warnings = []
        if path == 'codesystems' or path == 'valuesets':
            fileName = '-'.join(fileName.split('-')[1:])
        if not fileName == elements['ID']:
            warnings.append("\t\tThe 'id' element: "+elements['ID']+" is incorrect")
        if not fileName == elements['url'].split('/')[-1]:
            if not elements['url'].startswith('http://hl7.org/fhir/5.0/'): #passes any R5 extensions
                warnings.append("\t\tThe 'url' element: "+elements['url']+" is incorrect")
        if not ''.join(fileName.split('-')) == elements['name'].split('/')[-1]:
            warnings.append("\t\tThe 'name' element: "+elements['name']+" is incorrect")
        if not fileName.replace('-','') == elements['title'].replace(' ',''):
            warnings.append("\t\tThe 'title' element: "+elements['title']+" is incorrect")
        if warnings:
            print("\t",file)
            for x in warnings:
                print(x)
                
'''check example filenames'''
examplesPath = os.listdir('./examples')
print('examples')
for examples in examplesPath:
    if not examples.endswith("Example.xml"):
        print("\t",examples," - The filename is does not have the suffix 'Example'")

'''Capabilitystatement Checker - checks if all s are in the CapabilityStatement'''
tree= ET.parse('./CapabilityStatement/CapabilityStatement-UKCore.xml')
root = tree.getroot()

print('CapabilityStatement')
capabilityStatement = []
for tag in root.findall('.//{*}type'):
    capabilityStatement.append(tag.attrib["value"])

for p in currentProfiles:
    if p not in capabilityStatement:
        print("\t",p,"is missing from the CapabilityStatement")

print("\n\nCheck Complete!")
    
        

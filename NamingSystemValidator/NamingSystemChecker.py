import xml.etree.ElementTree as ET
import os

paths = ['structuredefinitions','valuesets','codesystems']
for path in paths:
    files = os.listdir('./'+path)
    print(path)
    for file in files:
        
        '''Check files are in correct folder '''
        if path == 'structuredefinitions' and file.split('-')[0]!='Extension' and file.split('-')[0]!='UKCore':
            print("The file '"+file+"' has either an incorrect prefix or in the wrong folder '"+path+"'.")
        if path == 'valuesets' and file.split('-')[0]!='ValueSet':
            print("The file '"+file+"' has either an incorrect prefix or in the wrong folder '"+path+"'.")  
        if path == 'codesystems' and file.split('-')[0]!='CodeSystem':
            print("The file '"+file+"' has either an incorrect prefix or in the wrong folder '"+path+"'.") 
        
        '''open file'''
        tree = ET.parse("./"+path+"/"+file)
        root = tree.getroot()
        elements = {'ID':'id','url':'url','name':'name','title':'title'}
        '''check for missing elements'''
        for key,value in elements.items():
            try:
                elements[key]=(root.findall('.//{*}'+str(value))[0].get('value'))
            except:
                print("\tThe element '"+key+"' is missing")
                break
            
                '''check elements naming convention are correct'''
        fileName = file.replace('.xml','')
        warnings = []
        if path == 'codesystems' or path == 'valuesets':
            fileName = '-'.join(fileName.split('-')[1:])
        if not fileName == elements['ID']:
            warnings.append("\t\tThe 'id' element: "+elements['ID']+" is incorrect")
        if not fileName == elements['url'].split('/')[-1]:
            warnings.append("\t\tThe 'url' element: "+elements['url']+" is incorrect")
        if not ''.join(fileName.split('-')) == elements['name'].split('/')[-1]:
            warnings.append("\t\tThe 'name' element: "+elements['name']+" is incorrect")
        if not fileName.replace('-','') == elements['title'].replace(' ',''):
            warnings.append("\t\tThe 'title' element: "+elements['title']+" is incorrect")
        if warnings:
            print("\t"+file)
            for x in warnings:
                print(x)

examplesPath = os.listdir('./examples')
print('examples')
for examples in examplesPath:
    if not examples.endswith("Example.xml"):
        print("\t",examples," - The filename is does not have the suffix 'Example'")
              
print("\n\nCheck Complete!")
    
        

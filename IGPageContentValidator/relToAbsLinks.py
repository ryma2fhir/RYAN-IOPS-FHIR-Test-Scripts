# -*- coding: utf-8 -*-
"""
This script converts relative links to absolute weblinks saving in a text file for use with Bash command
Note this only works with the Simplifier website due to prefixing the links with https://simplifier.net, although very easily adapted for any other website.'''
"""

from linkScraper import *

''' change internal links to external, and write to OutputLinks.txt '''
def OutputLinks(url):
    unique_websites = ListOfLinks(url)
    unique_websites = sorted(unique_websites)
    a = open('OutputLinks.txt', 'w')
    for link in unique_websites:
        linkOutput = "https://simplifier.net"+link
        a.write(linkOutput+ '\n')
    a.close()
    
OutputLinks(data)

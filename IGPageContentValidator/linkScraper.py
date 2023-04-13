# -*- coding: utf-8 -*-
""" 
This script returns a list of relative weblinks fond within the webpage given in website.txt
"""

from bs4 import BeautifulSoup # this module helps in web scrapping.
import requests  # this module helps us to download a web page

with open('./IGPageContentValidator/website.txt', 'r') as file:
    data = file.readline().strip('\n')

'''returns html page of link within website.txt'''    
def RequestData(url):
    data  = requests.get(url).text
    soup = BeautifulSoup(data,"html.parser")
    return soup
    
'''retrieve all links within the page, including the banner, and returns only relative links starting with /guide'''
def ListOfLinks(url):
    soup = RequestData(url)
    websites = []
    print("webpages to check")
    for link in soup.find_all('a'):
        site = link.get('href')
        if isinstance(site, str) and site[0:6]=='/guide':
            print(site)
            websites.append(site)
    print('\n\n')
    list_set = set(websites)
    unique_websites = list(list_set)
    return unique_websites


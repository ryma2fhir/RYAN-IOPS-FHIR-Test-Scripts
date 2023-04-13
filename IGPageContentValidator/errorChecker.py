# -*- coding: utf-8 -*-
""" 
This script checks webpages for any error messages
"""

from linkScraper import *


''' Interates over ListOfLinks returning any pages that have errors '''
def FindErrors(url):
    websites = ListOfLinks(url)
    for e in websites:
        url_check = 'https://simplifier.net'+ e
        data_check  = requests.get(url_check).text
        soup_check = BeautifulSoup(data_check,"html.parser")
        error = soup_check.find_all('div',{'class':"error"})
        if error:
            print(url_check)
            for err in error:
                print(err)
            print()
    print("Check Complete")
    

FindErrors(data)

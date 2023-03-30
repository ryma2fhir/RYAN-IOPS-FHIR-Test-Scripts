# Simplifier Implementation Guide Validation

The validator works by scraping the webpage within website.txt for any internal webpage links within the Simplifier Guide. These webpages are then validated individually. 

The website validation is in three parts:
- HTML Error Checking - This checks each page for any html errors. This captures any errors caused by using Simplifier relative links, e.g `{{pagelink: }}`, amongst the usual coding errors.
- Link Checking - This checks each page to ensure every link within it is goes to a valid webpage.
- Spell Checking - This checks the spelling on every page within the site.

## Instructions

1. Edit the file `website.txt` ensuring the website you want scraped is entered on the first line. Note: Only Simplifier.net guides will work with this checker.  
2. Click the `Actions` button. the top 3 actions will be the individual checkers needed. Wait until there is a green tick next to each. 
3. Within each Action click the `Build` button
4. Within the Build click the following for the results:
- HTML Error Check
- Link Check
- Spell Check

## HTML Error Checking
Uses the errorChecker.py script. Checks for any html errors on a website using BeautifulSoup's `find_all('div',{'class':"error"})`. This returns the errors for each individual page.

## Link Checking
Uses [Linkchecker](https://linkchecker.github.io/linkchecker/index.html) for any broken links.
This is set up to only output the errors for each individual page. Uses the confif file linkcheckerrc.

### Options Used
- `-r 2` - Sets the recursion level at 2. All links within the webpage within websites.txt and any internal webapges linked from this are scraped for links and checked. 
- `--check-extern` - check external links are valid.
- `--no-status` - do not show status apart from errors.
- `-f linkcheckerrc` - use config file - setup so that it will check any pages <50mb in size. 

### LinkCheckerError: File size too large
If the reponse is `[url-error-getting-content] could not get content:` `LinkCheckerError: File size too large` the page size is larger than what the maximum has been set. To fix this increase the `maxfilesizedownload` (line 177) within the `linkcheckerrc` file accordingly.

## Spell Checking
Uses [Aspell](https://www.gnu.org/software/wget/manual/wget.html#Option-Syntax). The script LinkFinder.py crawls through the webpage witin website.txt and filters all relative links before prefixing `https://simplifier.net` converting them to absolute links that can be checked. Aspell is then used to check each webpage individually, outputting any mispelt words in a list along with the number of times it occurs within that page.

### Options Used
#### wget
- `-nv` - Turn off verbose without being completely quiet (use ‘-q’ for that), which means that error messages and basic information still get printed. 
- `-O` - The documents will not be written to the appropriate files, but all will be concatenated together and written to file. If ‘-’ is used as file, documents will be printed to standard output, disabling link conversion.

#### Aspell
- `-H` - Sets mode to HTML
- `-add-html-skip=nocheck` - Will not check any anything within the HTML tags <nocheck> </nocheck>. This is useful to ignore any external rendered information, e.g. HL7 Resources. Note that the option has to be lowercase to work, i.e. -add-html-skip=NoCheck will not work. 
- `--camel-case` - Will split camelcase into seperate words and checks each individual word
- `--lang en_GB`  - Sets dictionary to British English
- `-p ./actions/.aspell.en.pws` - Personal dictionary for any words that are correct but not in the main dictionary. Each additional word needs to be on a seperate line. Alphabetical characters only.
-  `|sort| uniq -c;` - Sorts the list for each individual webpage alphabetically, only shows unique words, adds a count of how many times each word appears.

### Adding words to the Dictionary
It is possible to add common words that are correct into the dictionary. 
- The dictionary is named `.aspell.en.pws`
- The file SHALL begin with `personal_ws-1.1 en <number>` where `<number>` is roughly the number of words within the dictionary 
- Add each word on a seperate line
- Each word is case-sensitive
- No numbers or symbols allowed

##### limtations to Aspell
Cannot ignore capitalised terms, so NHS will stil be checked and will need to be added to the personal dictionary.
Cannot ignore words with numbers, so 'HL7' wil be spell checked as 'HL', and of course will come up as a mispelt word.


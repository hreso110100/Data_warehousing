/**
 *
 * @param {string} item Strings of authors (dirty, unparsed), string should contain name of author and part (percentage) of him work on EPC
 * @returns {Array<{name: string, part: string}>}
 */
export function parseAuthors(item) {
    item = item.replace(/\[/g, '').replace(/]/g, '');
    const authors = item.split('-');
    const authorsArray = [];
    authors.forEach((author, index) => {
        const authorData = author.split('(');
        const name = authorData[0].replace(/\s/g, '').replace('\'', '\'\'');

        let part = null;
        if (authorData[1])
            part = authorData[1].replace(')', '').replace(' ', '');
        authorsArray.push({name, part})
    });
    return authorsArray;
}

/**
 *
 * @param {string} info Very long string of information's about epc (dirty and unparsed)
 * @returns {{ISBN: string, numberOfPages: string, publisher: string, edition: string}}
 */
export function parseInfo(info) {
    let ISBN = null;
    let ISSN = null;
    let publisher = null;
    let numberOfPages = null;
    let edition = null;

    const infoArray = info.split(' - ');

    infoArray.forEach(element => {
        if (element !== '' && element) {
            const page = element.match(/(([0-9-]+)? (S\.|\.S|s\.|\.s|P\.|\.P|p\.|\.p) ?([0-9-]+)?)/g);
            if (element.includes('ISBN')) {
                ISBN = element.replace(/[^0-9-]/g, '');
            } else if (element.includes('ISSN')) {
                ISSN = element.replace(/[^0-9-]/g, '');
            } else if (page) {
                if (page[0].includes('S.')) {
                    numberOfPages = page[0].split('S.')[1].replace(/[^0-9-]/g, '');
                } else if (page[0].includes('P.')) {
                    numberOfPages = page[0].split('P.')[1].replace(/[^0-9-]/g, '');
                } else {
                    numberOfPages = page[0].replace(/[^0-9-]/g, '');
                }
            } else if (element.includes(':')) {
                publisher = element.replace(/(\s|,)/g, '').replace(/'/g, '\'\'').split('Spôsobprístupu:')[0];
            } else if (element.includes('vyd')) {
                edition = element.replace(/[^a-zA-Z0-9.]/g, '');
            }
        }
    });

    return {ISBN, ISSN, publisher, numberOfPages, edition}
}


/**
 *
 * @param {string} epc_keywords input string of EPC keywords
 * @return {Array<string>} Array of keywords (cleared)
 */
export function parseKeyWords(epc_keywords) {
    if (epc_keywords && epc_keywords.length > 0 && epc_keywords !== '[]') {
        const cleared_keywords_string = epc_keywords.replace(/([\[\]'])/g, '');
        return cleared_keywords_string.split(', ')
    }
    return []
}

export function parseQuotes(citations) {
    if (citations !== '[]') {
        citations = citations.replace(/(\['|']|")/g, '').replace(/'/g, '');
        citations = citations.split('\',');
        return citations;
    }
    return [];
}

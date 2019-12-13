const mysql = require('mysql');
const fs = require('fs');
const config = require('./config');
const csv = require('csv-parser');

// getting path to datu, it should be included in the npm run start pathToData ... -> look readme
const pathToData = process.argv[2];
const facultyName = process.argv[3];

if (!pathToData) {
    console.error('Missing argument, path to data');
    return
}

if (!facultyName) {
    console.error('Missing argument, faculty name make sure that faculty name is same like on DB');
    return
}

/**
 * @property {Array<csv>} results
 * @property {string} epcsQuery
 * @property {number} epcsId
 * @property {string} authorsQuery
 * @property {number} authorsId
 * @property {string} epcsAuthorsQuery
 */
const results = [];

let allAuthors = [];
let allWorkplaces = [];
let allKeywords = [];
let facultyId = -1;

let epcsQuery = `INSERT INTO epcs(id, arch_num, title, epc_cat, edition, publisher, year, isbn, issn, numberOfPages) VALUES`;
let epcsId = -1;

let authorsQuery = `INSERT INTO authors(id, name, lastname) VALUES`;
let authorsId = -1;

let workplacesQuery = `INSERT INTO workplaces(id, faculty_id, name) VALUES`;
let workplaceId = -1;

let epcsAuthorsQuery = `INSERT INTO epcs_authors(part, epc_id, author_id, workplace_id) VALUES`;

let keywordsQuery = `INSERT INTO keywords(id, name) VALUES`;
let keywordsId = -1;
let epcsKeywordsQuery = `INSERT INTO epcs_keywords(epc_id, keyword_id) VALUES`;

let quotesQuery = `INSERT INTO quotes(id, quote, year, code) VALUES`;
let quotesId = -1;
let epcsQuotesQuery = `INSERT INTO epcs_quotes(epc_id, quote_id) VALUES`;

/**
 * @type {Connection}
 */
const connection = mysql.createConnection({
    host: config.db_host,
    database: config.database,
    user: config.db_user,
    password: config.db_pass,
    multipleStatements: true
});

function loadIds(callback) {
    let hasId = false;
    connection.connect();
    connection.query(`SELECT MAX(id) as lastIdEpcs FROM epcs;
    SELECT MAX(id) as lastIdAuthors FROM authors;
    SELECT MAX(id) as lastIdKeywords FROM keywords;
    SELECT MAX(id) as lastIdQuotes FROM quotes;
    SELECT MAX(id) as lastIdWorkplaces FROM workplaces;
    SELECT id as facultyId FROM faculties WHERE name like '${facultyName}'`, (err, results) => {
        if (err) {
            console.log(err)
        }
        results.forEach((result, index) => {
            if (result.length > 0) {
                if (result[0].hasOwnProperty('lastIdEpcs')) {
                    if (result[0].lastIdEpcs) {
                        epcsId = result[0].lastIdEpcs;
                    } else {
                        epcsId = 0;
                    }
                } else if (result[0].hasOwnProperty('lastIdAuthors')) {
                    if (result[0].lastIdAuthors) {
                        authorsId = result[0].lastIdAuthors + 1;
                    } else {
                        authorsId = 0;
                    }
                } else if (result[0].hasOwnProperty('lastIdKeywords')) {
                    if (result[0].lastIdKeywords) {
                        keywordsId = result[0].lastIdKeywords + 1;
                    } else {
                        keywordsId = 1;
                    }
                } else if (result[0].hasOwnProperty('lastIdQuotes')) {
                    if (result[0].lastIdQuotes) {
                        quotesId = result[0].lastIdQuotes;
                    } else {
                        quotesId = 0;
                    }
                } else if (result[0].hasOwnProperty('lastIdWorkplaces')) {
                    if (result[0].lastIdWorkplaces) {
                        workplaceId = result[0].lastIdWorkplaces + 1;
                    } else {
                        workplaceId = 0;
                    }
                } else if (result[0].hasOwnProperty('facultyId')) {
                    if (result[0].facultyId) {
                        facultyId = result[0].facultyId;
                        hasId = true;
                    }
                }
            } else if (index === 5) {
                connection.query(`INSERT INTO faculties(name) VALUE('${facultyName}')`, undefined, (err, result) => {
                    if (err)
                        console.log(err);
                    facultyId = result.insertId;
                    callback()
                })
            }
        });
        if (hasId) {
            callback()
        }
    });
}

/**
 * @description procedure to get Array<string> from csv file (data.csv) placed on ./
 */
function csvToDb() {
    try {
        fs.createReadStream(pathToData)
            .pipe(csv(['id', 'epc_cat', 'year', 'title', 'info', 'authors', 'count_of_citations', 'citations', 'keywords', 'workplace']))
            .on('data', (data) => results.push(data))
            .on('end', () => {
                results.forEach((row, index) => {
                    const info = parseInfo(row.info);
                    epcsId++;
                    writeEpc({
                        id: epcsId,
                        arch_num: row.id,
                        title: row.title.replace(/'/g, '\'\'').replace(/(\/|\n|)/g, ''),
                        epc_cat: row.epc_cat ? row.epc_cat : null,
                        year: row.year,
                        edition: info.edition,
                        publisher: info.publisher,
                        isbn: info.ISBN,
                        issn: info.ISSN,
                        numberOfPages: info.numberOfPages
                    });
                    allWorkplaces.push(row.workplace);
                    allWorkplaces = [...new Set(allWorkplaces)];
                    let workplaceIndex = allWorkplaces.indexOf(row.workplace);
                    workplaceId += workplaceIndex;
                    if (!workplacesQuery.includes(`(${workplaceId}, ${facultyId},'${row.workplace}')`)) {
                        workplacesQuery = workplacesQuery.concat(`(${workplaceId}, ${facultyId},'${row.workplace}'),`)
                    }

                    const authors = parseAuthors(row.authors);
                    authors.forEach(author => allAuthors.push(author.name));
                    allAuthors = [...new Set(allAuthors)];
                    authors.forEach(author => {
                        let authorIndex = allAuthors.indexOf(author.name);
                        authorsId += authorIndex;
                        let fullName = author.name.split(',');
                        if (!authorsQuery.includes(`(${authorsId},'${fullName[1]}','${fullName[0]}')`)) {
                            authorsQuery = authorsQuery.concat(`(${authorsId},'${fullName[1]}','${fullName[0]}'),`);
                        }
                        if (epcsAuthorsQuery.indexOf(`('${author.part}', ${epcsId}, ${authorsId}, ${workplaceId})`) === -1) {
                            epcsAuthorsQuery = epcsAuthorsQuery.concat(`('${author.part}', ${epcsId}, ${authorsId}, ${workplaceId}),`);
                        }
                        authorsId -= authorIndex;
                    });

                    const keywords = parseKeyWords(row.keywords);
                    keywords.forEach(keyword => {
                        keywordsId++;
                        keywordsQuery = keywordsQuery.concat(`(${keywordsId}, '${keyword}'),`);
                        epcsKeywordsQuery = epcsKeywordsQuery.concat(`(${epcsId}, ${keywordsId}),`);
                    });

                    const quotes = parseQuotes(row.citations);
                    quotes.forEach(quote => {
                        let quoteYear = quote.match(/^\d{4}/g);
                        let quoteCode = quote.match(/\[\d]/g);
                        let insertCode = quoteCode ? quoteCode[0].replace(/[\[\]]/g, '') : null;
                        quotesId++;
                        quotesQuery = quotesQuery.concat(`(${quotesId},'${quote}', ${quoteYear}, '${insertCode}'),`);
                        epcsQuotesQuery = epcsQuotesQuery.concat(`(${epcsId}, ${quotesId}),`)
                    });

                    workplaceId -= workplaceIndex;
                });
                // prepared query for epcs (all values in one shot)
                insertToDb(epcsQuery);

                // prepared query for authors (all values in one shot)
                insertToDb(authorsQuery);

                // prepared query for workplaces
                insertToDb(workplacesQuery);

                // if authors and epcs exists, now we can push epcsAuthors
                insertToDb(epcsAuthorsQuery);

                // prepared query for keywords
                insertToDb(keywordsQuery);

                // if keywords and epcs exists, now we can push epcsKeywords
                // console.log(epcsKeywordsQuery)
                insertToDb(epcsKeywordsQuery);

                // insert quotes
                insertToDb(quotesQuery);

                // after epcs exists and quotes too create relationship
                insertToDb(epcsQuotesQuery);
                // console.log(epcsAuthorsQuery.length)
                // end connection to db
                connection.end();
            });
    } catch (e) {
        console.log(e);
        connection.end();
    }
}

/**
 * @description simple function for execution of DB query
 * @param query
 */
function insertToDb(query) {
    query = query.slice(0, -1);
    query = query.replace(/'null'/g, null );
    connection.query(query, (error, results, fields) => {
        if (error) {
            console.log(error.code);
        }
        console.log(results);
    });
}

/**
 * @description append formatted string to epc query (global variable)
 * @param id
 * @param epc_id
 * @param title
 * @param epc_cat
 * @param edition
 * @param publisher
 * @param year
 * @param isbn
 * @param numberOfPages
 * @param arch_num
 * @param issn
 */
function writeEpc({id, arch_num, title, epc_cat, edition, publisher, year, isbn, issn, numberOfPages}) {
    epcsQuery = epcsQuery.concat(`(${id},'${arch_num}','${title}','${epc_cat}','${edition}','${publisher}',${year},'${isbn}','${issn}','${numberOfPages}'),`)
}

/**
 *
 * @param {string} item Strings of authors (dirty, unparsed), string should contain name of author and part (percentage) of him work on EPC
 * @returns {Array<{name: string, part: string}>}
 */
function parseAuthors(item) {
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
function parseInfo(info) {
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
        if (numberOfPages && numberOfPages.includes('-')) {
            const pagesDiff = numberOfPages.split('-');
            numberOfPages = (parseInt(pagesDiff[1], 10) - parseInt(pagesDiff[0], 10)).toString();
            if (numberOfPages.includes('-')) {
                numberOfPages = null;
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
function parseKeyWords(epc_keywords) {
    if (epc_keywords && epc_keywords.length > 0 && epc_keywords !== '[]') {
        const cleared_keywords_string = epc_keywords.replace(/([\[\]'])/g, '');
        return cleared_keywords_string.split(', ')
    }
    return []
}

function parseQuotes(citations) {
    if (citations !== '[]') {
        citations = citations.replace(/(\['|']|")/g, '').replace(/'/g, '');
        citations = citations.split('\',');
        return citations;
    }
    return [];
}

loadIds(() => {
    csvToDb();
});

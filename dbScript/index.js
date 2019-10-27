const mysql = require('mysql');
const fs = require('fs');
const config = require('./config');
const csv = require('csv-parser');

// getting path to datu, it should be included in the npm run start pathToData ... -> look readme
const pathToData = process.argv[2];

if (!pathToData) {
    console.error('Missing argument, path to data');
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
let epcsQuery = `INSERT INTO epcs(id, arch_num, title, epc_cat, edition, publisher, year, isbn, issn, numberOfPages, workplace) VALUES`;
let epcsId = 0;

let authorsQuery = `INSERT INTO authors(id, name) VALUES`;
let authorsId = 0;
let epcsAuthorsQuery = `INSERT INTO epcs_authors(part, epc_id, author_id) VALUES`;

let keywordsQuery = `INSERT INTO keywords(id, name) VALUES`;
let keywordsId = 0;
let epcsKeywordsQuery = `INSERT INTO epcs_keywords(epc_id, keyword_id) VALUES`;

/**
 * @type {Connection}
 */
const connection = mysql.createConnection({
    host: config.db_host,
    database: config.database,
    user: config.db_user,
    password: config.db_pass
});

/**
 * @description procedure to get Array<string> from csv file (data.csv) placed on ./
 */
function csvToDb() {
    try {
        fs.createReadStream(pathToData)
            .pipe(csv(['id', 'epc_cat', 'year', 'title', 'info', 'authors', 'count_of_citations', 'citations', 'keywords', 'workplace']))
            .on('data', (data) => results.push(data))
            .on('end', () => {
                connection.connect();
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
                        numberOfPages: info.numberOfPages,
                        workplace: row.workplace
                    });
                    const authors = getAuthors(row.authors);
                    authors.forEach(author => {
                        authorsId++;
                        authorsQuery = authorsQuery.concat(`(${authorsId},'${author.name}'),`);
                        epcsAuthorsQuery = epcsAuthorsQuery.concat(`('${author.part}', ${epcsId}, ${authorsId}),`)
                    });

                    const keywords = parseKeyWords(row.keywords);
                    keywords.forEach(keyword => {
                        keywordsId++;
                        keywordsQuery = keywordsQuery.concat(`(${keywordsId}, '${keyword}'),`);
                        epcsKeywordsQuery = epcsKeywordsQuery.concat(`(${epcsId}, ${keywordsId}),`);
                    });

                    const citations = parseCitations(row.citations);
                });
                // prepared query for epcs (all values in one shot)
                epcsQuery = epcsQuery.slice(0, -1);
                insertToDb(epcsQuery, (result) =>{
                    console.log(result)
                });

                // prepared query for authors (all values in one shot)
                authorsQuery = authorsQuery.slice(0, -1);
                insertToDb(authorsQuery, (result) =>{
                    console.log(result)
                });

                // if authors and epcs exists, now we can push epcsAuthors
                epcsAuthorsQuery = epcsAuthorsQuery.slice(0, -1);
                insertToDb(epcsAuthorsQuery, (result) =>{
                    console.log(result)
                });

                // prepared query for keywords
                keywordsQuery = keywordsQuery.slice(0, -1);
                insertToDb(keywordsQuery, (result) =>{
                    console.log(result)
                });

                // if keywords and epcs exists, now we can push epcsKeywords
                epcsKeywordsQuery = epcsKeywordsQuery.slice(0, -1);
                insertToDb(epcsKeywordsQuery, (result) =>{
                    console.log(result)
                });

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
 * @param callback
 */
function insertToDb(query, callback) {
    connection.query(query, (error, results, fields) => {
        if (error) {
            callback(error.code);
        }
        callback(results);
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
function writeEpc({id, arch_num, title, epc_cat, edition, publisher, year, isbn, issn, numberOfPages, workplace}) {
    epcsQuery = epcsQuery.concat(`(${id},'${arch_num}','${title}','${epc_cat}','${edition}','${publisher}',${year},'${isbn}','${issn}','${numberOfPages}','${workplace}'),`)

    // FOR TESTING
    // connection.query(`INSERT INTO epcs(id, epc_id, title, epc_cat, edition, publisher, year, isbn, numberOfPages, workplace) VALUES(${id},'${epc_id}','${title}','${epc_cat}','${edition}','${publisher}',${year},'${isbn}','${numberOfPages}','${workplace}')`, (err, res, fields) => {
    //     if (err) {
    //         console.log(err);
    //     }
    //     console.log(res);
    // })
}

/**
 *
 * @param {string} item Strings of authors (dirty, unparsed), string should contain name of author and part (percentage) of him work on EPC
 * @returns {Array<{name: string, part: string}>}
 */
function getAuthors(item) {
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

function parseCitations(citations) {
    if (citations !== '[]') {
        citations = citations.replace(/(\['|'])/g, '');
        // console.log(citations.split('\','));
        return citations;
    }
    return null;
}

csvToDb();

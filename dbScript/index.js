const mysql = require('mysql');
const fs = require('fs');
const config = require('./config');
const csv = require('csv-parser');

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
 * @property {Array<csv>} results
 * @property {string} epcsQuery
 * @property {number} epcsId
 * @property {string} authorsQuery
 * @property {number} authorsId
 * @property {string} epcsAuthorsQuery
 */
const results = [];
let epcsQuery = `INSERT INTO epcs(id, epc_id, title, epc_cat, edition, publisher, year, isbn, numberOfPages) VALUES`;
let epcsId = 0;
let authorsQuery = `INSERT INTO authors(id, name) VALUES`;
let authorsId = 0;
let epcsAuthorsQuery = `INSERT INTO epcs_authors(part, epc_id, author_id) VALUES`;

/**
 * @description procedure to get Array<string> from csv file (data.csv) placed on ./
 */
function csvToDb() {
    try {
        fs.createReadStream('./data.csv')
            .pipe(csv(['id', 'epc_cat', 'year', 'title', 'info', 'authors', 'count_of_citations', 'citations', 'keywords', 'workplace']))
            .on('data', (data) => results.push(data))
            .on('end', () => {
                connection.connect();
                results.forEach(row => {
                    const info = parseInfo(row.info);
                    epcsId++;
                    writeEpc({
                        id: epcsId,
                        epc_id: row.id,
                        title: row.title.replace(/'/g, '\'\''),
                        epc_cat: row.epc_cat ? row.epc_cat : null,
                        year: row.year,
                        edition: info.edition,
                        publisher: info.publisher,
                        isbn: info.ISBN,
                        numberOfPages: info.numberOfPages
                    });
                    const authors = getAuthors(row.authors)
                    authors.forEach(author => {
                        authorsId++;
                        authorsQuery = authorsQuery.concat(`(${authorsId},'${author.name}'),`)
                        epcsAuthorsQuery = epcsAuthorsQuery.concat(`('${author.part}', ${epcsId}, ${authorsId}),`)
                    });

                    parseKeyWords(row.keywords);
                });

                // prepared query for epcs (all values in one shot)
                epcsQuery = epcsQuery.slice(0, -1);
                insertToDb(epcsQuery);

                // prepared query for authors (all values in one shot)
                authorsQuery = authorsQuery.slice(0, -1);
                insertToDb(authorsQuery);

                // if authors and epcs exists, now we can push epcsAuthors
                epcsAuthorsQuery = epcsAuthorsQuery.slice(0, -1);
                insertToDb(epcsAuthorsQuery);

                // end connection to db
                connection.end();
            });
    } catch (e) {
        console.log(e);
        connection.end();
    }
}

function checkDb() {
    connection.connect();
    connection.query(`SELECT max(id) FROM epcs`, (error, results, fields) => {
        console.log(results);
    });
    connection.end();
}

/**
 * @description simple function for execution of DB query
 * @param query
 */
function insertToDb(query) {
    if (false) {
        connection.query(query, (error, results, fields) => {
            if (error)
                console.log(error);
            // console.log(results);
        });
    }

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
 * @param language
 * @param arch_num
 * @param issn
 * @param quoted_ant
 */
function writeEpc({id, epc_id, title, epc_cat, edition, publisher, year, isbn, numberOfPages, language, arch_num, issn, quoted_ant}) {
    epcsQuery = epcsQuery.concat(`(${id}, '${epc_id}', '${title}', '${epc_cat}', '${edition}', '${publisher}', ${year}, '${isbn}', '${numberOfPages}'),`)
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
    let publisher = null;
    let numberOfPages = null;
    let edition = null;

    const infoArray = info.split(' - ');

    infoArray.forEach(element => {
        if (element !== '' && element) {
            if (element.includes('ISBN')) {
                ISBN = element.replace(/[^0-9-]/g, '');
            } else if (element.includes('s.')) {
                numberOfPages = element.replace(/[^0-9-]/g, '');
            } else if (element.includes(':')) {
                publisher = element;
            } else if (element.includes('vyd')) {
                edition = element.replace(/[^a-zA-Z0-9.]/g, '');
            }
        }
    });

    return {ISBN, publisher, numberOfPages, edition}
}


/**
 *
 * @param {string} epc_keywords input string of EPC keywords
 * @return {Array<string>} Array of keywords (cleared)
 */
function parseKeyWords(epc_keywords) {
    if (epc_keywords && epc_keywords.length > 0 && epc_keywords !== '[]') {
        const cleared_keywords_string = epc_keywords.replace(/([\[\]'])/g, '');
        console.log(cleared_keywords_string);
        const keywords_array = cleared_keywords_string.split(', ');
        console.log(keywords_array);
        return keywords_array
    }
    return null
}


csvToDb();
// checkDb()

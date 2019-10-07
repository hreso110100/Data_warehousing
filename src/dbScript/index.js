const mysql = require('mysql');
const fs = require('fs');
const config = require('./config');
const csv = require('csv-parser');

const connection = mysql.createConnection({
    host: config.db_host,
    database: config.database,
    user: config.db_user,
    password: config.db_pass
});

const results = [];
let epcsQuery = `INSERT INTO epcs(id, epc_id, title, epc_cat, edition, publisher, year, isbn, numberOfPages) VALUES`;
let epcsId = 0;
let authorsQuery = `INSERT INTO authors(id, name) VALUES`;
let authorsId = 0;
let epcsAuthorsQuery = `INSERT INTO epcs_authors(part, epc_id, author_id) VALUES`;

function csvToDb() {
    try {
        fs.createReadStream('./data.csv')
            .pipe(csv(['id', 'epc_cat', 'year', 'title', 'info', 'authors', 'SOME_NUMBER', 'SOMETHING', 'SOMETHING1']))
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
                    })
                    const authors = getAuthors(row.authors)
                    authors.forEach(author => {
                        authorsId++;
                        authorsQuery = authorsQuery.concat(`(${authorsId},'${author.name}'),`)
                        epcsAuthorsQuery = epcsAuthorsQuery.concat(`('${author.part}', ${epcsId}, ${authorsId}),`)
                    })
                });

                // prepared query for epcs (all values in one shot)
                epcsQuery = epcsQuery.slice(0, -1);
                insertToDb(epcsQuery);

                // prepared query for authors (all values in one shot)
                authorsQuery = authorsQuery.slice(0, -1);
                insertToDb(authorsQuery);

                // if authors and epcs exists, now we can push epcsAuthors
                epcsAuthorsQuery = epcsAuthorsQuery.slice(0, -1);
                console.log(epcsAuthorsQuery);
                insertToDb(epcsAuthorsQuery);

                // end connection to db
                connection.end();
            });
    } catch (e) {
        console.log(e);
        connection.end();
    }
}

function insertToDb(query){
    connection.query(query, (error, results, fields) => {
        if (error)
            console.log(error);
        console.log(results);
    });

}

function writeEpc({id, epc_id, title, epc_cat, edition, publisher, year, isbn, numberOfPages, language, arch_num, issn, quoted_ant}) {
    epcsQuery = epcsQuery.concat(`(${id}, '${epc_id}', '${title}', '${epc_cat}', '${edition}', '${publisher}', ${year}, '${isbn}', '${numberOfPages}'),`)
}

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


csvToDb();

<?php
$mysqli = mysqli_connect('localhost', 'root', 'mp3', 'TSSUWH');
$pg = pg_connect("host=localhost dbname=TSSU3 user=postgres password=mp3");

if (!$mysqli) {
    echo "Error: Unable to connect to MySQL." . PHP_EOL;
    echo "Debugging errno: " . mysqli_connect_errno() . PHP_EOL;
    echo "Debugging error: " . mysqli_connect_error() . PHP_EOL;
    exit;
}

if (!$pg){
	echo "Error PG";
	exit;
}

function mysql_vals($data){
	global $mysqli;
	foreach ($data as $k=>$val){
		if (is_numeric($val)) continue;
		elseif ($val===null) $data[$k] = 'null';
		else $data[$k] = '"'.$mysqli->escape_string($val).'"';
	}

	return implode(',', $data);
}

$select_epcs = 'SELECT
	3000000+"id_publication" as "id",
	"title",
	"subtitle",
	"edition",
	"publisher",
	"arch_num",
	"year",
	"isbnissn",
	"category_epc" as "epc_cat"
FROM "publication" p';

$select_authors = 'SELECT
	null as "id",
	3000000+ap."id_publication" as "authors_group_id",
	a."first_name" as "name",
	a."last_name" as "lastname",
	d."name" as "workplace",
	f."name" as "faculty",
	ap."contribution" as "part"
FROM "author_publication" ap
LEFT JOIN "author" a ON ap."id_author" = a."id_author"
LEFT JOIN "department_publication" dp ON ap."id_publication"=dp."id_publication"
LEFT JOIN "department" d ON dp."id_department" = d."id_department"
LEFT JOIN "faculty" f ON d."id_faculty"=f."id_faculty"';

$select_keywords = 'SELECT * FROM "keyword" WHERE LENGTH("value")<=100';
$select_keywords_br = 'SELECT 3000000+"id_publication" as "id_publication", value FROM "publication_keyword" pk
LEFT JOIN "keyword" k ON pk."id_keyword"=k."id_keyword"';
$select_quotes = 'SELECT 3000000+"id_citation" as "id_citation", "value", 3000000+"publication" as "publication" FROM "citation"';

$select_epcs_facts = 'SELECT
	3000000+p."id_publication" as "id_publication",
	"pages",
	COUNT(*) as "authors_count"
FROM "publication" p
LEFT JOIN "author_publication" ap ON p."id_publication"=ap."id_publication"
GROUP BY p."id_publication"';

//DIELA, AUTORSKE SKUPINY
$result = pg_query($pg, $select_epcs);
$data = [];
$data_ag = [];
while ($r = pg_fetch_assoc($result)) {
	$isbn = (strtolower(substr($r['isbnissn'], 0, 4))=='ISBN') ? substr($r['isbnissn'], 5) : null;
	$issn = (strtolower(substr($r['isbnissn'], 0, 4))=='ISSN') ? substr($r['isbnissn'], 5) : null;
	$td = [
		$r['id'],
		$r['title'].((!empty($r['subtitle'])) ? ' '.$r['subtitle'] : ''),
		$r['edition'],
		$r['publisher'],
		$r['arch_num'],
		$r['year'],
		$isbn,
		$issn,
		$r['epc_cat']
	];

	$data_ag[] = '('.$r['id'].')';

	$data[] = '('.mysql_vals($td).')';
}

if (!$mysqli->query("INSERT INTO `TSSUWH`.`DIM_epcs` VALUES ".implode(',', $data))){
	printf("Error message: %s\n", $mysqli->error);
}
$insertQ = "INSERT INTO `TSSUWH`.`DIM_authors_group` VALUES ".implode(',', $data_ag);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}
unset($data);
unset($data_ag);

//AUTORSTVA
$result = pg_query($pg, $select_authors);
$data = [];
while ($r = pg_fetch_assoc($result)) {
	$data[] = '('.mysql_vals($r).')';
}

$insertQ = "INSERT INTO `TSSUWH`.`DIM_authors` VALUES ".implode(',', $data);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}
unset($data);

//KLUCOVE SLOVA
$kws = $mysqli->query("SELECT * FROM `DIM_keywords` order by `name`");
$keywords = [];
$max_kw_id = 0;
while ($kw = $kws->fetch_object()){
	$keywords[$kw->name] = $kw->id;
	if ($kw->id>$max_kw_id) $max_kw_id = $kw->id;
}

$result = pg_query($pg, $select_keywords);
$data = [];
while ($r = pg_fetch_assoc($result)) {
	if (!isset($keywords[$r['value']])){
		$td = [
			++$max_kw_id,
			$r['value']
		];
		$keywords[$r['value']] = $max_kw_id;
		$data[] = '('.mysql_vals($td).')';
	}
}

$insertQ = "INSERT INTO `TSSUWH`.`DIM_keywords` VALUES ".implode(',', $data);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}
unset($data);

//PREPOJENIE KLUCOVYCH SLOV
$result = pg_query($pg, $select_keywords_br);
$data = [];
while ($r = pg_fetch_assoc($result)) {
	if (!isset($keywords[$r['value']])) continue;

	$data[] = '('.$r['id_publication'].', '.$keywords[$r['value']].')';
}

$insertQ = "INSERT INTO `TSSUWH`.`BR_epcs_keywords` VALUES ".implode(',', $data);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}
unset($data);
unset($keywords);

//CITACIE A TABULKA FAKTOV CITACII
$result = pg_query($pg, $select_quotes);
$data = [];
$data_q = [];
while ($r = pg_fetch_assoc($result)) {
	$td = [
		$r['id_citation'],
		$r['value'],
		null,
		null
	];
	$data[] = '('.mysql_vals($td).')';
	$data_q[] = '(null, '.$r['publication'].', '.$r['id_citation'].')';
}

$insertQ = "INSERT INTO `TSSUWH`.`DIM_quotes` VALUES ".implode(',', $data);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}
$insertQ = "INSERT INTO `TSSUWH`.`FACT_epc_quoted` VALUES ".implode(',', $data_q);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}
unset($data);

//TABULKA FAKTOV epc_written
$result = pg_query($pg, $select_epcs_facts);
$data = [];
while ($r = pg_fetch_assoc($result)) {
	$td = [
		null,
		$r['id_publication'],
		$r['id_publication'],
		$r['pages'],
		$r['authors_count']
	];
	$data[] = '('.mysql_vals($td).')';
}
$insertQ = "INSERT INTO `TSSUWH`.`FACT_epc_written` VALUES ".implode(',', $data);
if (!$mysqli->query($insertQ)){
	printf("Error message: %s\n", $mysqli->error);
}

$mysqli->close();
pg_close($pg);
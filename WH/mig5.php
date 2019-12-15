<?php
$mysqli = mysqli_connect('localhost', 'root', 'mp3', 'TSSUWH');
$pg = pg_connect("host=localhost dbname=TSSU4 user=postgres password=mp3");

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
	4000000+"praca_id" as "id",
	"nazov",
	"podnazov",
	"vydavatel",
	"archiv_id",
	"rok_vydania",
	"isbn",
	"issn",
	"kat_epc"
FROM "praca" p';

$select_authors = 'SELECT
	null as "id",
	4000000+pap."praca_id" as "authors_group_id",
	a."meno" as "name",
	a."priezvisko" as "lastname",
	p."nazov" as "workplace",
	f."nazov" as "faculty",
	pap."percent_podiel" as "part"
FROM "praca_autor_pracovisko" pap
LEFT JOIN "autor" a ON pap."autor_id" = a."autor_id"
LEFT JOIN "pracovisko" p ON pap."pracovisko_id" = p."pracovisko_id"
LEFT JOIN "fakulta" f ON p."fakulta_id"=f."fakulta_id"';

$select_keywords = 'SELECT DISTINCT klucove_slovo FROM "klucove_slovo" WHERE LENGTH("klucove_slovo")<=100';
$select_keywords_br = 'SELECT 4000000+"praca_id" as "praca_id", "klucove_slovo" FROM "klucove_slovo" WHERE LENGTH("klucove_slovo")<=100 GROUP BY "praca_id", "klucove_slovo"';
$select_quotes = 'SELECT
4000000+o."o_praca_id" as "id_citation",
"nazov",
4000000+o."praca_id" as "publication",
"rok_vydania",
"isbn",
"issn",
"pocet_stran"
FROM "ohlas" o
LEFT JOIN "o_praca" op ON o."o_praca_id"=op."o_praca_id"';

$select_epcs_facts = 'SELECT
	"id_publication",
	"pocet_stran",
	COUNT(T."pocet_stran") as "authors_count"
FROM(
	SELECT
		4000000+p."praca_id" as "id_publication",
		"pocet_stran"
	FROM "praca" p
	LEFT JOIN "praca_autor_pracovisko" pap ON p."praca_id"=pap."praca_id"
	GROUP BY p."praca_id", pap."autor_id"
	order by id_publication
) T
GROUP BY "id_publication", "pocet_stran"';

//DIELA, AUTORSKE SKUPINY
$result = pg_query($pg, $select_epcs);
$data = [];
$data_ag = [];
while ($r = pg_fetch_assoc($result)) {
	$td = [
		$r['id'],
		$r['nazov'].((!empty($r['podnazov'])) ? ' '.$r['podnazov'] : ''),
		null,
		$r['vydavatel'],
		$r['archiv_id'],
		$r['rok_vydania'],
		$r['isbn'],
		$r['issn'],
		$r['kat_epc']
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
	if (!isset($keywords[$r['klucove_slovo']])){
		$td = [
			++$max_kw_id,
			$r['klucove_slovo']
		];
		$keywords[$r['klucove_slovo']] = $max_kw_id;
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
	if (!isset($keywords[$r['klucove_slovo']])) continue;

	$data[] = '('.$r['praca_id'].', '.$keywords[$r['klucove_slovo']].')';
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
		join(' ', array_filter([$r['nazov'], ((!empty($r['issn'])) ? 'ISSN '.$r['issn'] : null), ((!empty($r['isbn'])) ? 'ISBN '.$r['isbn'] : null), ((!empty($r['pocet_stran'])) ? $r['pocet_stran'].'s' : null)])),
		$r['rok_vydania'],
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
		($r['pocet_stran']<0) ? null : $r['pocet_stran'],
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
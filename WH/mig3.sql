INSERT INTO `TSSUWH`.`DIM_epcs`
SELECT
	2000000+`dielo_id` as `id`,
	CONCAT(`nazov`, IF(`podnazov` IS NOT NULL AND `podnazov`!='', CONCAT(" ", `podnazov`), "")) as `title`,
	`vydanie` as `edition`,
	`miesto_vydania` as `publisher`,
	`archivacne_cislo` as `arch_num`,
	CASE
		WHEN `rok_vydania` LIKE '%-%' THEN SUBSTRING_INDEX(`rok_vydania`, '-', 1)
		ELSE `rok_vydania`
	END as `year`,
	`ISBN` as `isbn`,
	`ISSN` as `issn`,
	k.`kod` as `epc_cat`
FROM `diela` d
LEFT JOIN `kategorie` k ON d.`kategoria_id`=k.`kategoria_id`;

INSERT INTO `TSSUWH`.`DIM_authors_group`
SELECT
	2000000+`dielo_id` as `id`
FROM `diela`;

INSERT INTO `TSSUWH`.`DIM_authors`
SELECT
	null as `id`,
	2000000+adp.`dielo_id` as `authors_group_id`,
	a.`meno` as `name`,
	a.`priezvisko` as `lastname`,
	p.`nazov` as `workplace`,
	f.`nazov` as `faculty`,
	`percentualny_podiel` as `part`
FROM `autor_dielo_pracovisko` adp
LEFT JOIN `autori` a on adp.`autor_id`=a.`autor_id`
LEFT JOIN `pracoviska` p on adp.`pracovisko_id`=p.`pracovisko_id`
LEFT JOIN `fakulty` f on p.`fakulta_id`=f.`fakulta_id`;

INSERT INTO `TSSUWH`.`DIM_keywords`
SELECT
	null as `id`,
	`klucove_slovo` as `name`
FROM `klucove_slova` ks
LEFT JOIN `TSSUWH`.`DIM_keywords` kw ON ks.`klucove_slovo` = kw.`name`
WHERE kw.`id` IS NULL AND LENGTH(ks.`klucove_slovo`)<=100
GROUP BY `klucove_slovo`;

INSERT INTO `TSSUWH`.`BR_epcs_keywords`
SELECT
	2000000+`dielo_id`  as `epc_id`,
	`kw`.`id` as `keyword_id`
FROM `dielo_klucove_slovo` dks
LEFT JOIN `klucove_slova` ks ON dks.`klucove_slovo_id`=ks.`klucove_slovo_id`
LEFT JOIN `TSSUWH`.`DIM_keywords` kw ON ks.`klucove_slovo` = kw.`name`
WHERE `kw`.`id` IS NOT NULL
GROUP by `dielo_id`, kw.`id`;

INSERT INTO `TSSUWH`.`DIM_quotes`
SELECT
	2000000+`ohlas_id` as `id`,
	CONCAT_WS(
		" ",
		`nazov`,
		CASE
			WHEN `ISBN`='' OR `ISBN` IS NULL THEN null
			ELSE CONCAT("ISBN: ", `ISBN`)
		END,
		CASE
			WHEN `ISSN`='' OR `ISSN` IS NULL THEN null
			ELSE CONCAT("ISSN: ", `ISSN`)
		END,
		CASE
			WHEN `miesto_vydania`='' OR `miesto_vydania` IS NULL THEN null
			ELSE `miesto_vydania`
		END,
		CASE
			WHEN `strany`='' OR `strany` IS NULL THEN null
			ELSE `strany`
		END
		) as `quote`,
	`rok_vydania` as `year`,
	ko.`kod` as `code`
FROM `ohlasy` o
LEFT JOIN `kategorie_ohlasov` ko ON o.`kategorie_ohlasov_id`=ko.`kategorie_ohlasov_id`;


INSERT INTO `TSSUWH`.`FACT_epc_written`
SELECT
	`id`,
	`epc_id`,
	`authors_group_id`,
	IF(`pages_count`<0, null, `pages_count`),
	`authors_count`
FROM (
	SELECT
		`id`,
		`epc_id`,
		`authors_group_id`,
		CASE
			WHEN pages_count REGEXP '^[0-9]+$' THEN pages_count
			WHEN pages_count REGEXP '^[0-9]+\-[0-9]+$' THEN SUBSTRING_INDEX(pages_count, '-', -1)-SUBSTRING_INDEX(pages_count, '-', 1)
			ELSE null
		END as `pages_count`,
		COUNT(*) as `authors_count`
	FROM (
		SELECT
			null as `id`,
			2000000+d.`dielo_id` as `epc_id`,
			2000000+d.`dielo_id` as `authors_group_id`,
			CASE
				WHEN SUBSTRING(TRIM(`strany`), -1, 1) = '.' THEN SUBSTRING_INDEX(TRIM(`strany`), ' ', 1)
				ELSE SUBSTRING_INDEX(TRIM(`strany`), ' ', -1)
			END as pages_count
		FROM `diela` d
		LEFT JOIN `autor_dielo_pracovisko` adp ON d.`dielo_id`=adp.`dielo_id`
		GROUP BY adp.`dielo_id`, adp.`autor_id`
	)x
	GROUP BY epc_id
)S;

INSERT INTO `TSSUWH`.`FACT_epc_quoted`
SELECT
	null,
	2000000+`dielo_id` as `epc_id`,
	2000000+`ohlas_id` as `quote_id`
FROM `dielo_ohlas`;

#Indexy
-- ALTER TABLE `Citacie` ADD INDEX(`fkroky`);
-- ALTER TABLE `Katedra` ADD INDEX(`Fakulta_idFakulta`);
-- ALTER TABLE `Katedra_has_Zaznam` ADD INDEX(`Katedra_idKatedra`);
-- ALTER TABLE `Katedra_has_Zaznam` ADD INDEX(`Zaznam_idZaznam`);
-- ALTER TABLE `Zaznam` ADD INDEX(`fkmesta`);
-- ALTER TABLE `Zaznam` ADD INDEX(`fkroky`);
-- ALTER TABLE `Zaznam` ADD INDEX(`fkkat_epc`);
-- ALTER TABLE `Zaznam_has_Autor` ADD INDEX(`fkzaznam`);
-- ALTER TABLE `Zaznam_has_Autor` ADD INDEX(`fkautor`);
-- ALTER TABLE `Zaznam_has_Autor` ADD INDEX(`fkpercenta`);
-- ALTER TABLE `Zaznam_has_Citacie` ADD INDEX(`Zaznam`);
-- ALTER TABLE `Zaznam_has_Citacie` ADD INDEX(`Citacia`);
-- ALTER TABLE `Zaznam_has_Klucove_slova` ADD INDEX(`fkzaznam`);
-- ALTER TABLE `Zaznam_has_Klucove_slova` ADD INDEX(`fkklucoveslova`);

INSERT INTO `TSSUWH`.`DIM_epcs`
SELECT
	1000000+`idZaznam` as `id`,
	`Nazov` as `title`,
	null as `edition`,
	null as `publisher`,
	`arch_cislo` as `arch_num`,
	IF(`Roky`=0, null, `Roky`) as `year`,
	`ISBN` as `isbn`,
	`ISSN` as `issn`,
	`katepc` as `epc_cat`
FROM `Zaznam` z
LEFT JOIN `KAT_EPC` ke ON z.`fkkat_epc`=ke.`idkatepc`
LEFT JOIN `Roky` r ON z.`fkroky`=r.`idRoky`;

INSERT INTO `TSSUWH`.`DIM_authors_group`
SELECT
	1000000+`idZaznam` as `id`
FROM `Zaznam`;

INSERT INTO `TSSUWH`.`DIM_authors`
SELECT
	null as `id`,
	1000000+za.`fkzaznam` as `authors_group_id`,
	a.`Meno` as `name`,
	a.`Priezvisko` as `lastname`,
	k.`Katedra` as `workplace`,
	f.`Fakulta` as `faculty`,
	IF(p.`percenta`=1, null, p.`percenta`) as `part`
FROM `Zaznam_has_Autor` za
LEFT JOIN `Autor` a on za.`fkautor`=a.`idAutor`
LEFT JOIN `Percenta` p on za.`fkpercenta`=p.`idpercenta`
LEFT JOIN `Katedra_has_Zaznam` kz ON za.`fkzaznam`=kz.`Zaznam_idZaznam`
LEFT JOIN `Katedra` k ON kz.`Katedra_idKatedra`=k.`idKatedra`
LEFT JOIN `Fakulta` f ON k.`Fakulta_idFakulta`=f.`idFakulta`;

INSERT INTO `TSSUWH`.`DIM_keywords`
SELECT
	null as `id`,
	`kluc_slova` as `name`
FROM `Klucove_slova` ks
LEFT JOIN `TSSUWH`.`DIM_keywords` kw ON ks.`kluc_slova` = kw.`name`
WHERE kw.`id` IS NULL AND LENGTH(ks.`kluc_slova`)<=100
GROUP BY `kluc_slova`;

INSERT INTO `TSSUWH`.`BR_epcs_keywords`
SELECT
	1000000+`fkzaznam`  as `epc_id`,
	`kw`.`id` as `keyword_id`
FROM `Zaznam_has_Klucove_slova` zks
LEFT JOIN `Klucove_slova` ks ON zks.`fkklucoveslova`=ks.`idkluc_slova`
LEFT JOIN `TSSUWH`.`DIM_keywords` kw ON ks.`kluc_slova` = kw.`name`
WHERE `kw`.`id` IS NOT NULL
GROUP by `fkzaznam`, kw.`id`;

INSERT INTO `TSSUWH`.`DIM_quotes`
SELECT
	1000000+`idcitacia` as `id`,
	CONCAT_WS(
		" ",
		CASE
			WHEN `ISBN`='null' OR `ISBN`='' OR `ISBN` IS NULL THEN null
			ELSE CONCAT("ISBN: ", `ISBN`)
		END,
		CASE
			WHEN `ISSN`='null' OR `ISSN`='' OR `ISSN` IS NULL THEN null
			ELSE CONCAT("ISSN: ", `ISSN`)
		END,
		CASE
			WHEN `strany`='null' OR `strany`='' OR `strany` IS NULL THEN null
			ELSE `strany`
		END
		) as `quote`,
	IF(`Roky`=0, null, `Roky`) as `year`,
	null as `code`
FROM `Citacie` c
LEFT JOIN `Roky` r ON c.`fkroky`=r.`idRoky`;

INSERT INTO `TSSUWH`.`FACT_epc_written`
SELECT
	`id`,
	`epc_id`,
	`authors_group_id`,
	IF(`pages_count`<0, null, `pages_count`),
	`authors_count`
FROM (
	SELECT
		null as `id`,
		1000000+z.`idZaznam` as `epc_id`,
		1000000+z.`idZaznam` as `authors_group_id`,
		CASE
			WHEN pocet_stran REGEXP '^[0-9]+$'
				THEN pocet_stran
			WHEN pocet_stran REGEXP '^[0-9]+\-[0-9]+$'
				THEN SUBSTRING_INDEX(pocet_stran, '-', -1)-SUBSTRING_INDEX(pocet_stran, '-', 1)
			ELSE null
		END as `pages_count`,
		IF(za.`fkzaznam` IS NULL, null, COUNT(*)) as `authors_count`
	FROM `Zaznam` z
	LEFT JOIN `Zaznam_has_Autor` za ON z.`idZaznam`=za.`fkzaznam`
	GROUP BY z.`idZaznam`
)S;

INSERT INTO `TSSUWH`.`FACT_epc_quoted`
SELECT
	null,
	1000000+`Zaznam` as `epc_id`,
	1000000+`Citacia` as `quote_id`
FROM `Zaznam_has_Citacie`;

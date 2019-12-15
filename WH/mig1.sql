INSERT INTO `TSSUWH`.`DIM_epcs`
SELECT
	`id`,
	`title`,
	`edition`,
	`publisher`,
	`arch_num`,
	`year`,
	`isbn`,
	`issn`,
	`epc_cat`
FROM `epcs`;

INSERT INTO `TSSUWH`.`DIM_authors_group`
SELECT
	`id`
FROM `epcs`;

INSERT INTO `TSSUWH`.`DIM_authors`
SELECT
	null as `id`,
	ea.`epc_id` as `authors_group_id`,
	a.`name` as `name`,
	a.`lastname` as `lastname`,
	w.`name` as `workplace`,
	f.`name` as `faculty`,
	ea.`part` as `part`
FROM `epcs_authors` ea
LEFT JOIN `authors` a ON ea.`author_id` = a.`id`
LEFT JOIN `workplaces` w ON ea.`workplace_id` = w.`id`
LEFT JOIN `faculties` f ON w.`faculty_id`=f.`id`;

INSERT INTO `TSSUWH`.`DIM_keywords`
SELECT
	`id`,
	`name`
FROM `keywords`
GROUP BY `name`;

INSERT INTO `TSSUWH`.`BR_epcs_keywords`
SELECT
	`epc_id`,
	`whkw`.`id` as `keyword_id`
FROM `epcs_keywords` ek
LEFT JOIN `keywords` kw ON ek.`keyword_id`=kw.`id`
LEFT JOIN `TSSUWH`.`DIM_keywords` whkw ON kw.`name` = whkw.`name`
WHERE `kw`.`id` IS NOT NULL
GROUP by `epc_id`, whkw.`id`;


INSERT INTO `TSSUWH`.`DIM_quotes`
SELECT
	*
FROM `quotes`;

INSERT INTO `TSSUWH`.`FACT_epc_written`
SELECT
	`id`,
	`epc_id`,
	`authors_group_id`,
	`pages_count`,
	COUNT(*) as `authors_count`
FROM(
	SELECT
		null as `id`,
		e.`id` as `epc_id`,
		e.`id` as `authors_group_id`,
		`numberOfPages` as `pages_count`
	FROM `epcs` e
	LEFT JOIN `epcs_authors` ea ON e.`id`=ea.`epc_id`
	GROUP BY ea.`epc_id`, ea.`author_id`
)d
GROUP BY epc_id;

INSERT INTO `TSSUWH`.`FACT_epc_quoted`
SELECT
	null,
	`epc_id`,
	`quote_id`
FROM `epcs_quotes`;

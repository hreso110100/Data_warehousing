-- phpMyAdmin SQL Dump
-- version 4.2.12deb2+deb8u4
-- http://www.phpmyadmin.net
--
-- Hostiteľ: localhost
-- Čas generovania: Ne 27.Okt 2019, 21:18
-- Verzia serveru: 5.5.62-0+deb8u1
-- Verzia PHP: 5.6.40-0+deb8u1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Databáza: `TSSU`
--

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `authors`
--

CREATE TABLE IF NOT EXISTS `authors` (
  `id` int(11) NOT NULL,
  `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `epcs`
--

CREATE TABLE IF NOT EXISTS `epcs` (
  `id` int(11) NOT NULL,
  `title` varchar(100) COLLATE utf8_unicode_ci NOT NULL,
  `edition` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `publisher` varchar(300) COLLATE utf8_unicode_ci DEFAULT NULL,
  `numberOfPages` varchar(10) COLLATE utf8_unicode_ci DEFAULT NULL,
  `arch_num` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `year` year(4) NOT NULL,
  `isbn` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `issn` varchar(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `epc_cat` char(3) COLLATE utf8_unicode_ci DEFAULT NULL,
  `workplace` varchar(300) COLLATE utf8_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `epcs_authors`
--

CREATE TABLE IF NOT EXISTS `epcs_authors` (
`id` int(11) NOT NULL,
  `epc_id` int(11) NOT NULL,
  `author_id` int(11) NOT NULL,
  `part` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `epcs_keywords`
--

CREATE TABLE IF NOT EXISTS `epcs_keywords` (
`id` int(11) NOT NULL,
  `epc_id` int(11) NOT NULL,
  `keyword_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `epcs_quotes`
--

CREATE TABLE IF NOT EXISTS `epcs_quotes` (
`id` int(11) NOT NULL,
  `epc_id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `keywords`
--

CREATE TABLE IF NOT EXISTS `keywords` (
`id` int(11) NOT NULL,
  `name` varchar(100) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- --------------------------------------------------------

--
-- Štruktúra tabuľky pre tabuľku `quotes`
--

CREATE TABLE IF NOT EXISTS `quotes` (
`id` int(11) NOT NULL,
  `quote` varchar(200) COLLATE utf8_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `authors`
--
ALTER TABLE `authors`
 ADD PRIMARY KEY (`id`);

--
-- Indexes for table `epcs`
--
ALTER TABLE `epcs`
 ADD PRIMARY KEY (`id`);

--
-- Indexes for table `epcs_authors`
--
ALTER TABLE `epcs_authors`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `epc_id_2` (`epc_id`,`author_id`), ADD KEY `epc_id` (`epc_id`), ADD KEY `author_id` (`author_id`);

--
-- Indexes for table `epcs_keywords`
--
ALTER TABLE `epcs_keywords`
 ADD PRIMARY KEY (`id`), ADD UNIQUE KEY `epc_id_2` (`epc_id`,`keyword_id`), ADD KEY `epc_id` (`epc_id`), ADD KEY `keyword_id` (`keyword_id`);

--
-- Indexes for table `epcs_quotes`
--
ALTER TABLE `epcs_quotes`
 ADD PRIMARY KEY (`id`), ADD KEY `epc_id` (`epc_id`), ADD KEY `quote_id` (`quote_id`);

--
-- Indexes for table `keywords`
--
ALTER TABLE `keywords`
 ADD PRIMARY KEY (`id`);

--
-- Indexes for table `quotes`
--
ALTER TABLE `quotes`
 ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `epcs_authors`
--
ALTER TABLE `epcs_authors`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `epcs_keywords`
--
ALTER TABLE `epcs_keywords`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `epcs_quotes`
--
ALTER TABLE `epcs_quotes`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `keywords`
--
ALTER TABLE `keywords`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- AUTO_INCREMENT for table `quotes`
--
ALTER TABLE `quotes`
MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
--
-- Obmedzenie pre exportované tabuľky
--

--
-- Obmedzenie pre tabuľku `epcs_authors`
--
ALTER TABLE `epcs_authors`
ADD CONSTRAINT `epcs_authors_ibfk_1` FOREIGN KEY (`epc_id`) REFERENCES `epcs` (`id`),
ADD CONSTRAINT `epcs_authors_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `authors` (`id`);

--
-- Obmedzenie pre tabuľku `epcs_keywords`
--
ALTER TABLE `epcs_keywords`
ADD CONSTRAINT `epcs_keywords_ibfk_1` FOREIGN KEY (`epc_id`) REFERENCES `epcs` (`id`),
ADD CONSTRAINT `epcs_keywords_ibfk_2` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`id`);

--
-- Obmedzenie pre tabuľku `epcs_quotes`
--
ALTER TABLE `epcs_quotes`
ADD CONSTRAINT `epcs_quotes_ibfk_2` FOREIGN KEY (`quote_id`) REFERENCES `quotes` (`id`),
ADD CONSTRAINT `epcs_quotes_ibfk_1` FOREIGN KEY (`epc_id`) REFERENCES `epcs` (`id`);

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

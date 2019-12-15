#!/bin/bash
printf "TRUNCATE"
time mysql -u root -pmp3 TSSUWH < truncate.sql
printf "\nMIG 1"
time mysql -u root -pmp3 TSSU < mig1.sql
printf "\nMIG 2"
time mysql -u root -pmp3 TSSU1 < mig2.sql
printf "\nMIG 3"
time mysql -u root -pmp3 TSSU2 < mig3.sql
printf "\nMIG 4"
time php mig4.php
printf "\nMIG 5"
time php mig5.php
**Project modules** 

**1.** CREPCParser - scrapping data(only keywords) from CREPC website 

**2.** EPCParser - scrapping data from EPC website

!!! Modules can be run separately in Main.py  !!!

**How to scrap data:**

**1.** Based on your OS select proper driver in ElementOperations class (all drivers are stored in drivers folder)

**2.** src/config - contains config.yml where you can setup what data you want to scrap

**3.** Run Main.py to start scrapping(all data will be stored to data folder as csv file, HTML page will be also downloaded and saved to html_tables folder)

**ADDITIONAL INFO:** 

**1.** EPC page sometimes freezes so script will fail to complete scrapping

**2.** Saving data can sometimes be slow, because of the amount of data

**3.** Estimated time to scrap all data(SJF + REK + keywords) is approximately 1 day

**ER Diagram**

![ER Diagram](dbSchema/TSSU.png)

**DB Schema**

![DB Schema](dbSchema/FR.png)

### **DB Script**


**1.** `cd ./dbScript`

**2.** `npm install`

**3.** Create config.json, which contain variables for DB connection. (Use config.sample.json structure)

**4.** ` npm run start <path to data.csv>`

**Note: DB script requires installed Nodejs and npm.**

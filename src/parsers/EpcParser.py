import csv
import glob
import os
import time

from bs4 import BeautifulSoup

from src.config.Config import Config
from src.model.Record import Record
from src.parsers.ElementOperations import ElementOperations


class EpcParser(ElementOperations):
    visited_pages = []
    page_number = 1

    def __init__(self):
        super().__init__()
        self.config_dict = Config().load()
        self.clean_dirs()
        self.faculty_index = self.config_dict['data']['faculty_index']
        self.faculty = self.config_dict['data']['faculty']
        self.load_first_table(self.faculty_index)

    # clean data and html_tables dirs if configuration value data.remove is true
    def clean_dirs(self):
        if self.config_dict['data']['remove']:
            files = glob.glob('../data/*')
            for f in files:
                os.remove(f)

            files = glob.glob('../html_tables/*')
            for f in files:
                os.remove(f)

    # load first table base on faculty
    def load_first_table(self, faculty_index: int):
        self.driver.get(self.config_dict['web']['url_epc'])
        self.select_from_dropdown("#ctl00_ContentPlaceHolderMain_ddlKrit1", 2)
        self.select_from_dropdown("#ctl00_ContentPlaceHolderMain_ddlFakulta", faculty_index)
        self.click_on_element("#ctl00_ContentPlaceHolderMain_lblRoz")
        self.wait_for_element(10, "#ctl00_ContentPlaceHolderMain_chbOhlasy")
        self.click_on_element("#ctl00_ContentPlaceHolderMain_chbOhlasy")
        self.click_on_element("#ctl00_ContentPlaceHolderMain_chbAjPercentualnePodiely")
        self.click_on_element("#ctl00_ContentPlaceHolderMain_btnHladaj")
        self.wait_for_element(10, "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter")

    # scrap HTML tree and get data
    def scrap_table(self):
        scrapper = BeautifulSoup(self.driver.page_source, 'lxml')

        # saving HTML table for later
        with open(f'../html_tables/table_{self.faculty}_{self.page_number}.txt', 'a') as file:
            file.write(self.driver.page_source)
            self.page_number += 1

        rows = scrapper.select("#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr")
        rows.remove(rows[0])
        rows.remove(rows[-1])
        rows.remove(rows[-1])

        for row in rows:
            # getting list of citations
            try:
                list_citations = row.find_all("p")[1].text.split(")]", 1)[1].strip().split("   ")

                if list_citations[0] == "":
                    list_citations.clear()
            except IndexError:
                list_citations = []

            # getting other data
            data = row.find_all("span")

            record = Record(archive_number=data[0].text,
                            category=data[1].text,
                            year_of_publication=data[2].text,
                            name=data[3].text,
                            other=data[6].text,
                            authors=data[7].text,
                            number_citations=data[8].text,
                            citation_records=list_citations,
                            keywords=list())

            # saving gathered results to csv file
            with open(f'../data/records_{self.faculty}.csv', 'a') as file:
                writer = csv.writer(file)
                writer.writerow(
                    [record.archive_number, record.category, record.year_of_publication, record.name, record.other,
                     record.authors, record.number_citations, record.citation_records, record.keywords])

    # list through pagination
    def load_table(self):
        pagination_index = 0
        pagination_list = self.get_pagination_list()

        while pagination_index < len(pagination_list):
            # DOM was reloaded, need find reference again
            pagination_list = self.get_pagination_list()

            # if pagination is at the end just click
            if pagination_list[pagination_index].get_attribute("innerText") == "...":
                pagination_list[pagination_index].click()
                time.sleep(10)
                self.load_table()

            if not pagination_list[pagination_index].get_attribute("innerText") in self.visited_pages:
                pagination_list[pagination_index].click()
                self.visited_pages.append(pagination_list[pagination_index].get_attribute("innerText"))
                time.sleep(10)
                self.scrap_table()

            pagination_index += 1

        self.driver.quit()

    # getting pagination from HTML
    def get_pagination_list(self):
        pagination_list = self.driver.find_elements_by_css_selector(
            "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr:last-child td table tbody tr td")
        # remove ... at the beginning
        if pagination_list[0].get_attribute("innerText") == "...":
            pagination_list.remove(pagination_list[0])

        return pagination_list

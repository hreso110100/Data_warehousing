import csv
import glob
import os
import time

from bs4 import BeautifulSoup
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException

from src.config.Config import Config
from src.model.Record import Record
from src.parsers.ElementOperations import ElementOperations

PAGINATION = "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr:last-child td table tbody tr td"
ONE_RESULT = "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr"
NUMBER_OF_RESULTS = "#ctl00_ContentPlaceHolderMain_lPocetNajdenychZaznamov"


class EpcParser(ElementOperations):
    visited_pages = []
    page_number = 1

    def __init__(self):
        super().__init__()
        self.config_dict = Config().load()
        self.clean_dirs()
        self.faculty_index = self.config_dict['data']['faculty_index']
        self.faculty = self.config_dict['data']['faculty']
        self.load_base_page()

    # clean data and html_tables dirs if configuration value data.remove is true
    def clean_dirs(self):
        if self.config_dict['data']['remove']:
            files = glob.glob('../data/*')
            for f in files:
                os.remove(f)

            files = glob.glob('../html_tables/*')
            for f in files:
                os.remove(f)

    # load base page
    def load_base_page(self):
        self.driver.get(self.config_dict['web']['url_epc'])
        self.select_from_dropdown("#ctl00_ContentPlaceHolderMain_ddlKrit1", 2)
        self.select_from_dropdown("#ctl00_ContentPlaceHolderMain_ddlFakulta", self.faculty_index)
        time.sleep(3)

    # load first table base on faculty
    def load_results(self, workplace_index: int) -> bool:
        self.load_base_page()
        self.select_from_dropdown("#ctl00_ContentPlaceHolderMain_ddlStredisko", workplace_index)
        time.sleep(3)
        self.click_on_element("#ctl00_ContentPlaceHolderMain_lblRoz")
        time.sleep(3)
        self.click_on_element("#ctl00_ContentPlaceHolderMain_chbOhlasy")
        self.click_on_element("#ctl00_ContentPlaceHolderMain_chbAjPercentualnePodiely")
        self.click_on_element("#ctl00_ContentPlaceHolderMain_btnHladaj")
        self.wait_for_element(5, NUMBER_OF_RESULTS)

        if not self.driver.find_element_by_css_selector(NUMBER_OF_RESULTS).text.split(":")[1].strip() == "0":
            return True

        return False

    # scrap HTML tree and get data
    def scrap_table(self, workplace: str, pagination: bool):
        scrapper = BeautifulSoup(self.driver.page_source, 'lxml')

        # saving HTML table for later
        with open(f'../html_tables/table_{self.faculty}_{workplace}_{self.page_number}.txt', 'a') as file:
            file.write(self.driver.page_source)
            self.page_number += 1

        rows = scrapper.select(ONE_RESULT)
        rows.remove(rows[0])

        if pagination:
            rows.remove(rows[-1])
            rows.remove(rows[-1])

        for row in rows:
            data = row.find_all("span")

            # getting list of citations
            try:
                list_citations_copy = row.find_all("p")[1].text.replace(data[7].text, "#####")
                list_citations = list_citations_copy.split("#####", 1)[1].strip().split("   ")

                if list_citations[0] == "":
                    list_citations.clear()
            except IndexError:
                list_citations = []

            # getting bib. record
            bib_record_copy = row.find_all("td")[4].text
            bib_record_copy = bib_record_copy.replace(data[7].text, "")

            for citation in list_citations:
                bib_record_copy = bib_record_copy.replace(citation, "")

            if "In: " in bib_record_copy:
                other = bib_record_copy.split("In: ")[1].strip()
            else:
                other = data[6].text

            record = Record(archive_number=data[0].text,
                            category=data[1].text,
                            year_of_publication=data[2].text,
                            name=data[3].text + " " + data[4].text,
                            other=other,
                            authors=data[7].text,
                            number_citations=data[8].text,
                            citation_records=list_citations,
                            keywords=list(),
                            workplace=workplace)

            # saving gathered results to csv file
            with open(f'../data/records_{self.faculty}.csv', 'a') as file:
                writer = csv.writer(file)
                writer.writerow(
                    [record.archive_number, record.category, record.year_of_publication, record.name, record.other,
                     record.authors, record.number_citations, record.citation_records, record.keywords,
                     record.workplace])

    # list through pagination
    def load_table(self, workplace: str):
        pagination_list = self.get_pagination_list()

        if pagination_list is None:
            self.scrap_table(workplace, False)
            return

        for index, pagination in enumerate(pagination_list):
            # DOM was reloaded...need to refresh reference
            pagination_list = self.get_pagination_list()

            # if pagination is at the end just click
            if pagination_list[index].get_attribute("innerText") == "...":
                pagination_list[index].click()
                time.sleep(10)
                self.load_table(workplace)
            try:
                if not pagination_list[index].get_attribute("innerText") in self.visited_pages:
                    pagination_list[index].click()
                    self.visited_pages.append(pagination_list[index].get_attribute("innerText"))
                    time.sleep(10)
                    self.scrap_table(workplace, True)
            except (NoSuchElementException, StaleElementReferenceException):
                pass
        self.visited_pages.clear()

    # scrapping data from specific TUKE workplace
    def load_workplace_records(self):
        workplaces_selector = self.driver.find_element_by_css_selector("#ctl00_ContentPlaceHolderMain_ddlStredisko")
        workplaces = [workplace.text for workplace in workplaces_selector.find_elements_by_tag_name("option")]

        # removing duplicate workplaces
        workplace_dict = {}

        for index, workplace in enumerate(workplaces[1:]):
            split_workplace = workplace.split("=")
            workplace_dict[split_workplace[0]] = (split_workplace[1], index + 1)

        for (workplace_key, workplace_value) in workplace_dict.items():
            print(f"Current workplace: {workplace_value[0]}")
            if self.load_results(workplace_value[1]):
                self.page_number = 1
                self.load_table(workplace_value[0])

        self.driver.quit()

    # getting pagination from HTML
    def get_pagination_list(self):
        if self.is_element_present(PAGINATION):
            pagination_list = self.driver.find_elements_by_css_selector(PAGINATION)

            # remove ... at the beginning
            if pagination_list[0].get_attribute("innerText") == "...":
                pagination_list.remove(pagination_list[0])

            return pagination_list

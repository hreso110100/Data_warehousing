import csv
import glob
import os
import time

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.wait import WebDriverWait

from src.config.Config import Config
from src.model.Record import Record

CONFIG_PATH = '../src/config/config.yml'


class Parser:
    visited_pages = []
    page_number = 1

    def __init__(self, config: Config):
        self.config_dict = config.parse_config(CONFIG_PATH)
        self.driver = webdriver.Firefox(executable_path='../drivers/geckodriverMacOs')
        self.clean_dirs()
        self.faculty_index = self.config_dict['data']['faculty_index']
        self.faculty = self.config_dict['data']['faculty']
        self.load_home_page()

    def clean_dirs(self):
        if self.config_dict['data']['remove']:
            files = glob.glob('../data/*')
            for f in files:
                os.remove(f)

            files = glob.glob('../html_tables/*')
            for f in files:
                os.remove(f)

    def load_home_page(self):
        self.driver.get(self.config_dict['web']['url'])
        self.select_from_dropdown("ctl00_ContentPlaceHolderMain_ddlKrit1", 2)
        self.load_first_table(self.faculty_index)

    def load_first_table(self, faculty_index: int):
        self.select_from_dropdown("ctl00_ContentPlaceHolderMain_ddlFakulta", faculty_index)
        self.click_on_element("ctl00_ContentPlaceHolderMain_btnHladaj")
        WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "ctl00_ContentPlaceHolderMain_gvVystupyByFilter")))

    def select_from_dropdown(self, parent: str, index: int):
        selector = self.click_on_element(parent)
        Select(selector).select_by_index(index)

    def click_on_element(self, element_id: str):
        element = WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, element_id)))
        element.click()

        return element

    def scrap_table(self):
        scrapper = BeautifulSoup(self.driver.page_source, 'lxml')
        rows = scrapper.select("#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr")

        with open(f'../html_tables/table_{self.faculty}_{self.page_number}.txt', 'a') as file:
            file.write(self.driver.page_source)
            self.page_number += 1

        rows.remove(rows[0])
        rows.remove(rows[-1])
        rows.remove(rows[-1])

        for row in rows:
            data = row.find_all("span")

            record = Record(archive_number=data[0].text,
                            category=data[1].text,
                            year_of_publication=data[2].text,
                            name=data[3].text,
                            author=data[7].text,
                            responsibilities=data[5].text,
                            citations=data[8].text)

            with open(f'../data/records_{self.faculty}.csv', 'a') as file:
                writer = csv.writer(file)
                writer.writerow(
                    [record.archive_number, record.category, record.year_of_publication, record.name, record.author,
                     record.responsibilities, record.citations])

    def load_table(self):
        pagination_index = 0
        pagination_list = self.driver.find_elements_by_css_selector(
            "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr:last-child td table tbody tr td")

        while pagination_index < len(pagination_list):

            # DOM was reloaded, need find reference again
            pagination_list = self.driver.find_elements_by_css_selector(
                "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr:last-child td table tbody tr td")

            # remove ... at the beginning
            if pagination_list[0].get_attribute("innerText") == "...":
                pagination_list.remove(pagination_list[0])

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

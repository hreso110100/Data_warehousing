import time

import pandas
from bs4 import BeautifulSoup

from src.config.Config import Config
from src.parsers.ElementOperations import ElementOperations


class CrepcParser(ElementOperations):

    def __init__(self):
        super().__init__()
        self.config_dict = Config().load()
        self.faculty = self.config_dict['data']['faculty']

    # searching for keywords and appending to csv
    def get_keywords(self):
        file = pandas.read_csv(f'../data/records_{self.faculty}.csv', header=None)

        for index, item in enumerate(file.values):
            if int(item[2]) > 2017:
                self.driver.get(self.config_dict['web']['url_crepc_2'])
                self.update_csv(file, index, self.search_on_crepc_2(item[3]))
            else:
                self.driver.get(self.config_dict['web']['url_crepc_1'])
                self.update_csv(file, index, self.search_on_crepc_1(item[3], self.parse_author(item[5])))

    # return surname of first author in list
    def parse_author(self, authors: str) -> str:
        return authors.split(",", 1)[0].replace("[", "")

    # adding keywords to csv column
    def update_csv(self, file, row_index: int, data: list):
        file.set_value(row_index, 8, data)
        file.to_csv(f'../data/records_{self.faculty}.csv', index=False, header=False)

    # searching for record on CREPC_2
    def search_on_crepc_2(self, name: str) -> list:
        self.type_to_element("#fdivSimpleSearch__ebExpression", name)
        self.click_on_element("#fdivSimpleSearch__anDoSearch")
        time.sleep(5)

        if not self.is_element_present(".alert-danger"):
            if self.is_element_present(".group.line-margin:nth-of-type(1)"):
                return self.scrap_keywords(".group.line-margin:nth-of-type(1) a")
            else:
                return []
        else:
            return []

    # searching for record on CREPC_1
    def search_on_crepc_1(self, name: str, author: str) -> list:
        self.click_on_element("#page2_link")
        self.click_on_element("#anchClear")
        time.sleep(2)
        self.type_to_element("#srchEdit1:nth-of-type(1)", name)
        self.type_to_element("#srchEdit3:nth-of-type(1)", author)
        self.click_on_element("#anchSearch")
        time.sleep(2)

        if not self.is_element_present("#lblInfo"):
            self.click_on_element(".rght a")
            time.sleep(5)

            return self.scrap_keywords(".wht1:nth-of-type(7) a")
        else:
            return []

    # scrap keywords from HTML page
    def scrap_keywords(self, selector: str) -> list:
        scrapper = BeautifulSoup(self.driver.page_source, 'lxml')
        keywords = scrapper.select(selector)
        keywords_list = []

        for keyword in keywords:
            keywords_list.append(keyword.text)

        return keywords_list

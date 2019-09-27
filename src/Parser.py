import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.wait import WebDriverWait

URL = 'https://epc.lib.tuke.sk/PrehladPubl.aspx'


class Parser:
    pagination_index = 0

    def __init__(self):
        self.driver = webdriver.Firefox(executable_path='../drivers/geckodriverMacOs')
        self.load_home_page()

    def load_home_page(self):
        self.driver.get(URL)
        self.select_from_dropdown("ctl00_ContentPlaceHolderMain_ddlKrit1", 2)

    def load_first_table(self, faculty_index: int):
        self.select_from_dropdown("ctl00_ContentPlaceHolderMain_ddlFakulta", faculty_index)
        self.click_on_button("ctl00_ContentPlaceHolderMain_btnHladaj")
        WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, "ctl00_ContentPlaceHolderMain_gvVystupyByFilter")))

    def select_from_dropdown(self, parent: str, index: int):
        selector = WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, parent)))
        selector.click()
        Select(selector).select_by_index(index)

    def click_on_button(self, button: str):
        button = WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, button)))
        button.click()

    def load_table(self):
        self.pagination_index = 1
        pagination_list = self.driver.find_elements_by_css_selector(
            "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr:last-child td table tbody tr td")

        while self.pagination_index < len(pagination_list):
            pagination_list = self.driver.find_elements_by_css_selector(
                "#ctl00_ContentPlaceHolderMain_gvVystupyByFilter tbody tr:last-child td table tbody tr td")

            if pagination_list[self.pagination_index].get_attribute("innerText") == "1":
                self.pagination_index += 1
                continue
                # scraping

            pagination_list[self.pagination_index].click()
            self.pagination_index += 1

            if self.pagination_index == len(pagination_list) and \
                    pagination_list[self.pagination_index - 1].get_attribute("innerText") != "...":
                return

            time.sleep(5)

        self.load_table()


if __name__ == '__main__':
    parser = Parser()
    parser.load_first_table(7)
    parser.load_table()
    parser.driver.quit()

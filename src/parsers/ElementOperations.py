from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.wait import WebDriverWait


class ElementOperations:

    def __init__(self):
        # change here for other type of drivers
        self.driver = webdriver.Firefox(executable_path='../drivers/geckodriverMacOs')

    def select_from_dropdown(self, parent: str, index: int):
        selector = self.click_on_element(parent)
        Select(selector).select_by_index(index)

    def wait_for_element(self, seconds: int, element_id: str):
        WebDriverWait(self.driver, seconds).until(
            expected_conditions.presence_of_element_located((By.ID, element_id)))

    def click_on_element(self, element_id: str):
        element = WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.ID, element_id)))
        element.click()

        return element

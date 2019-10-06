from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
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

    def wait_for_element(self, seconds: int, element: str):
        WebDriverWait(self.driver, seconds).until(
            expected_conditions.presence_of_element_located((By.CSS_SELECTOR, element)))

    def type_to_element(self, element: str, text: str):
        self.wait_for_element(10, element)
        self.driver.find_element_by_css_selector(element).send_keys(text)

    def is_element_present(self, element: str):
        try:
            self.driver.find_element_by_css_selector(element)
            return True
        except NoSuchElementException:
            return False

    def click_on_element(self, element: str):
        element = WebDriverWait(self.driver, 10).until(
            expected_conditions.presence_of_element_located((By.CSS_SELECTOR, element)))
        element.click()

        return element

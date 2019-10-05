import pandas

from src.parsers.ElementOperations import ElementOperations


class CrepcParser(ElementOperations):

    def __init__(self):
        super().__init__()

    def get_keywords(self):
        data = pandas.read_csv('test.csv', usecols=3, header=None)
        print(data)

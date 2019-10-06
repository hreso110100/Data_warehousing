from src.parsers.CrepcParser import CrepcParser
from src.parsers.EpcParser import EpcParser

if __name__ == '__main__':
    epc_parser = EpcParser()
    epc_parser.load_table()

    #crepc_parser = CrepcParser()
    #crepc_parser.get_keywords()

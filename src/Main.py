from src.parsers.CrepcParser import CrepcParser
from src.parsers.EpcParser import EpcParser

if __name__ == '__main__':
    # this will download base data
    # epc_parser = EpcParser()
    # epc_parser.load_workplace_records()

    # this will download keywords
    crepc_parser = CrepcParser()
    crepc_parser.get_keywords()

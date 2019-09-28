from src.Parser import Parser

if __name__ == '__main__':
    parser = Parser()
    parser.load_first_table(2)
    parser.load_table()
    parser.driver.quit()

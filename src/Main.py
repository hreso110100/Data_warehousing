from src.Parser import Parser


from src.config.Config import Config

if __name__ == '__main__':
    parser = Parser(Config())
    parser.load_table()
    parser.get_keywords()
    parser.driver.quit()

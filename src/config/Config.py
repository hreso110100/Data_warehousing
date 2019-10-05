import yaml

CONFIG_PATH = '../src/config/config.yml'


class Config:

    def load(self):
        return yaml.load(open(CONFIG_PATH), Loader=yaml.FullLoader)

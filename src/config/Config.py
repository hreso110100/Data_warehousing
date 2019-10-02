import yaml


class Config:

    def parse_config(self, config_path: str):
        return yaml.load(open(config_path), Loader=yaml.FullLoader)

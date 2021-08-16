from model.DataBuilder import DataBuilder
import pandas as pd


class Mohanetal(DataBuilder):

    def __init__(self, path):
        self.data_p = path

        df = pd.read_csv(path)
        df_y = df["Recharge"]

        # without ST currently!
        df_x = df[["P", "T", "PET", "Rd", "S", "ksat", "SWSC", "AI", "EW", "ρb", "Clay", "LU"]]

        # devide into forest or no forest
        lu = {'Cropland': 1, 'Pasture': 1, 'Forest': 0, 'Urban': 1, 'Barren': 1}

        df_x["LU"] = df_x["LU"].apply(lambda x: lu[x])

        # A tree needs categorical values again
        self.cn = ['Very Low', 'Low', 'Medium', 'High', 'Very High']
        self.fn = df_x.columns
        # includes rightmost edge
        bins = [-1, 10, 100, 300, 600, 2000]
        p = pd.cut(df_y, bins=bins, labels=self.cn)
        self.y = p.cat.codes.to_numpy()
        self.X = df_x.to_numpy()

    def get_x(self):
        return self.X

    def get_y(self):
        return self.y

    @property
    def classnames(self):
        return self.cn

    @property
    def featurenames(self):
        return self.fn

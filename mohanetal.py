from model.DataBuilder import DataBuilder
import pandas as pd
import numpy as np

def cut(d):
    # Africa rough
    min_lon = -18.16
    #max_lon = 0 # "east africa"
    max_lon = 50
    max_lat = 35
    #max_lat = 28 -> height of Egypth
    #min_lat = 15 -> roughly beginning of Sah.
    min_lat = -33.7

    mask_lon = (d.lon >= min_lon) & (d.lon <= max_lon)
    mask_lat = (d.lat >= min_lat) & (d.lat <= max_lat)

    cropped = d.where(mask_lon & mask_lat)
    cropped.dropna(inplace=True)

    return cropped


class Mohanetal(DataBuilder):

    def __init__(self, path):
        self.data_p = path

        df = pd.read_csv(path)

        df.rename(columns={'Latitude': 'lat', 'Longitude': 'lon'}, inplace=True)

        df = cut(df)

        df_y = df["Recharge"]

        # without ST currently!
        df_x = df[["P", "T", "PET", "Rd", "S", "ksat", "SWSC", "AI", "EW", "ρb", "Clay", "LU"]]

        # devide into forest or no forest
        #lu = {'Cropland': 1, 'Pasture': 1, 'Forest': 0, 'Urban': 1, 'Barren': 1}
        lu = {'Cropland': 2, 'Pasture': 3, 'Forest': 5, 'Urban': 1, 'Barren': 4}

        #st = {'Clay': 1, 'Loam' 'ClayCoarse sand' 'ClayFine sand' 'Coarse sand' 'Fine sand':}

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

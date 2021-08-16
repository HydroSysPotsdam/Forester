from datetime import datetime as dt
import numpy as np
import xarray as xr
import pandas as pd

from model.DataBuilder import DataBuilder


inputs = [
    {"data": "watergap_22c_landcover.nc4", "varname": "landcover", "label": "LC", "cat": True},
    # 1 - Evergreen needleleaf forest, 2 - Evergreen broadleaf forest, 3 - Deciduous needleleaf forest,
    # 4 - Deciduous broadleaf forest, 5 - Mixed forest, 6 - Closed shrubland, 7 - Open shrubland, 8 - Woody savanna,
    # 9 - Savanna, 10 - Grassland, 12 - Cropland, 14 - Cropland / natural vegetation mosaik,
    # 15 - Snow and Ice (permanent), 16 - Barren or sparsely vegetated
    # {"data":"watergap_22c_slopefactor.nc4","varname": "slopefactor", "label": "SF", "cat": False},
    # Factor of relief-related groundwater recharge factor the lower the value, the higher slope and vice versa
    {"data": "watergap_22c_rootdepth.nc4", "varname": "rootdepth", "label": "RD", "cat": False},
    {"data": "watergap_22c_aridhumid.nc4", "varname": "aridhumid", "label": "AH", "cat": True},
    # Distinguishing (semi)arid and humid grid cells, 1 - semi-arid, 0 - humid
    # {"data":"watergap_22c_aqfactor.nc4","varname": "aqfactor", "label: "AQF", "cat": False},
    # Aquifer-related groundwater recharge factor, towards 1 - high hydraulc conductivity,
    # towards 0.7 low hydraulic conductivity, towards 0.5 very low hydraulic conductivity
    {"data": "watergap_22c_glolak.nc4", "varname": "glolak", "label": "GL", "cat": False},
    # Fraction of lakes that are connected to the river
    {"data": "watergap_22c_glowet.nc4", "varname": "glowet", "label": "GW", "cat": False},
    # Fraction of wetlands that are connected to the river
    {"data": "watergap_22c_gwfactor.nc4", "varname": "gwfactor", "label": "GWF", "cat": False},
    # Groundwater recharge factor as product of single components
    {"data": "watergap_22c_loclak.nc4", "varname": "loclak", "label": "LL", "cat": False},
    # Fraction of lakes that are within a grid cell but not fed by upstream river
    {"data": "watergap_22c_locwet.nc4", "varname": "locwet", "label": "LW", "cat": False},
    # Fraction of wetlands that are within a grid cell but not fed by upstream river
    # {"data":"watergap_22c_permaglacfactor.nc4","varname": "permaglacfactor", "label": "PF", "cat": False},
    # Factor for permafrost extent the lower the value, the more permafrost (or glaciers) are in the grid cell and vice versa
    {"data": "watergap_22c_reglak.nc4", "varname": "reglak", "label": "RL", "cat": False},
    # Fraction of regulated lakes
    {"data": "watergap_22c_res.nc4", "varname": "res", "label": "RE", "cat": False},
    # Fraction of reservoirs
    {"data": "watergap_22c_rgmax.nc4", "varname": "rgmax", "label": "RG", "cat": False},
    # Maximum recharge rate
    {"data": "watergap_22c_smax.nc4", "varname": "smax", "label": "SM", "cat": False},
    # Maximum soil water storage
    {"data": "watergap_22c_tawc.nc4", "varname": "tawc", "label": "TA", "cat": False},
    # Total available water capacity for the top meter
    # {"data":"watergap_22c_texturefactor.nc4","varname": "texturefactor", "label": "TF", "cat": False},
    # Soil-texture dependend groundwater factor the lower the value, the less permeable the soil is
        ]

c_landcover = {1: "Evergreen needleleaf forest", 2: "Evergreen broadleaf forest", 3: "Deciduous needleleaf forest",
               4: "Deciduous broadleaf forest", 5: "Mixed forest", 6: "Closed shrubland", 7: "Open shrubland",
               8: "Woody savanna", 9: "Savanna", 10: "Grassland", 12: "Cropland",
               14: "Cropland / natural vegetation mosaik", 15: "Snow and Ice (permanent)",
               16: "Barren or sparsely vegetated"}
c_simple_lc = {1: "Forest", 2: "no Forest"}
c_aridhumid = {1: "Semi-Arid", 2: "Humid"}

# get Labels used for plotting
fn = [x["label"] for x in inputs]
fn.append("P")

# Categories of GWR
cn = ['Very Low', 'Low', 'Medium', 'High', 'Very High']

# includes rightmost edge
bins = [-1, 10, 100, 300, 600, 2000]


def check_nan(x):
    return np.isnan(np.sum(x))


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

    cropped = d.where(mask_lon & mask_lat, drop=True)

    return cropped


class WaterGAP(DataBuilder):

    def __init__(self, path):
        self.cells = None
        self.cut_land = True
        self.data_p = path

    def get_x(self):
        x = self.load_inputs()
        return x.T

    def get_y(self):
        return self.load_outputs()

    @property
    def classnames(self):
        return cn

    @property
    def featurenames(self):
        return fn

    def __clean(self, xf, varn):
        '''
        Cleans up input data but assumes that spatial order is maintained
        '''
        if self.cut_land:
            xf = cut(xf)

        df = xf.to_dataframe()
        df.sort_index(level=1, inplace=True)
        df.reset_index(inplace=True)
        df.drop('time', axis=1, inplace=True)
        df.dropna(axis=0, inplace=True)

        if self.cells is None:
            self.cells = df[["lat", "lon"]]

        if varn == "landcover":
            # Maps landcover to binary values
            # TODO adapt to real categorical
            df[varn] = df[varn].apply(lambda x: 1 if x > 6 else 2)

        return df[varn].values

    def load_precip(self):
        path = 'precip_monthly_1975-2005.nc4'
        date = xr.open_dataset(self.data_p + "pr_hist_HadGEM2-ES/" + path)
        d = date.resample(time="1Y").sum() # calculate mm/year
        d = d.mean("time")
        if self.cut_land:
            d = cut(d)
        df = d.to_dataframe()
        df.sort_index(level=1, inplace=True)
        df = df.dropna()
        df = df.merge(self.cells, how="right", on=["lat", "lon"])
        # print(df.head(10))
        return df.pr.values

    def load_inputs(self):
        '''
        @return a matrix of inputs
        '''
        data = []

        for i in inputs:
            date = xr.open_dataset(self.data_p + "inputs/" + i["data"], decode_times=False)

            date_clean = self.__clean(date, i["varname"])
            data.append(date_clean)

        data.append(self.load_precip())
        return np.array(data)

    def load_outputs(self):

        # QR-unit: kg m-2 s-1 = kg pro m2 pro sekunde
        # gives mm/month:
        conv = 86400*0.001*1000*30

        # For this analyis 1901 is there reference
        reference_date = '1/1/1901'
        # months since 1661 (ISMIP uses 1601) -> issue: causes out of bounds in datetime
        m_start = (1901 - 1661) * 12
        m_end = (2005 - 1661) * 12
        # Thus hist data = 01/01/1861 = 2400 months since 1661

        n = "watergap2_gfdl-esm2m_ewembi_historical_histsoc_co2_qr_global_monthly_1861_2005.nc4"
        date = xr.open_dataset(self.data_p + "watergap/" + n, decode_times=False)
        date = date * conv
        date = date.sel(time=slice(m_start, m_end))
        units, year = date.time.attrs['units'].split('since')
        date['time'] = pd.date_range(start=reference_date, periods=date.sizes['time'], freq='MS')

        #Select a time range for a monthly mean - currently 1975-2005 = 30 years
        # date = date.sel(time=reference_date)
        date = date.sel(time=slice(dt(1975, 1, 1), dt(2004, 12, 31)))
        d = date.resample(time="1Y").sum() # calculate mm/year
        d = d.mean("time")

        if self.cut_land:
            d = cut(d)

        df = d.to_dataframe()
        df.sort_index(level=1, inplace=True)
        df = df.dropna()

        df = df.merge(self.cells, how="right", on=["lat", "lon"])
        p = pd.cut(df.qr, bins=bins, labels=cn)
        return p.cat.codes.to_numpy()


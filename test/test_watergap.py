# TODO implement a real testsuit
import os, sys
script_path = os.path.realpath(os.path.dirname(__name__))
os.chdir(script_path)
sys.path.append("..")

from watergap import WaterGAP as wg
import model.TreeBuilder as TB

t_watergap = TB.TreeBuilder(wg("../../../CART-ISIMIP/data/"), 5, 2)
t_watergap.fit()
a = t_watergap.to_json()

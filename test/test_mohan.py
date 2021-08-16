# TODO implement a real testsuit
import os, sys
script_path = os.path.realpath(os.path.dirname(__name__))
os.chdir(script_path)
sys.path.append("..")

from mohanetal import Mohanetal as mh
import model.TreeBuilder as TB

t_mohan = TB.TreeBuilder(mh("../../../CART-ISIMIP/data/Mohan-data/data.csv"), 5, 2)
t_mohan.fit()
a = t_mohan.to_json()
print(a)

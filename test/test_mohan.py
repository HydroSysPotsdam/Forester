# TODO implement a real testsuit
import os, sys
script_path = os.path.realpath(os.path.dirname(__name__))
os.chdir(script_path)
sys.path.append("..")

from mohanetal import Mohanetal as mh
import model.TreeBuilder as TB

t_mohan = TB.TreeBuilder(mh("data/mohan.csv"), 5, 2)
t_mohan.fit()
a = t_mohan.to_json()
print(a)

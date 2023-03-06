Quickstart
==========

Installation
------------

To run Forester, you need to have a working installation of Python and a web-browser of you choice.

You can install Forester by cloning the GitHub repository to you machine. When you have installed Git, this can be done by running the command::

    git clone https://github.com/HydroSysPotsdam/Forester.git

Alternatively you can also download a compressed version of Forester directly from the GitHub Repository by clicking *Code* and *Download Zip*. Please decompress the archive at a suitable location.

Forester needs some Python packages to work correctly. You will find a list of them under `Forester/requirements.txt`. You can install the dependencies using pip by running::

    pip install -r requirements.txt

or conda::

    conda install --yes --file requirements.txt

Congratulations! You are now ready to run Forester.

Running Forester
----------------

Forester can now be started by navigating to its root directory and running::

    python run.py

This will start a webserver. In the terminal, it will display the address that is used to access the server. By default this is::

    127.0.0.1:8000/

Open this link in your preferred browser and you should see Forester's project dashboard.

.. hint:: If you can't access the website, check whether a different address or port are displayed in the terminal.

Ready, Set, Go!
---------------

Welcome to Forester! You will start all your projects from the project dashboard. For now, we have prepared a selection of examples that will illustrate Foresters core functionality. It's really not that hard to distinguish examples from your projects, as they are marked quite clearly.

The next section explains how you can add a new project based on your files from *Matlab, R* or *Forester*. If you can't wait, open an example of your choice by clicking on the corresponding tile. We think you should start with :ref:`Fisher's Iris <Editor>` - to preserve the tradition.

.. figure:: _static/dashboard.png
   :width: 100 %
   :alt: forester's project dashboard
   :align: center

   Phew! You did everything correctly when you see Forester's project dashboard in your browser.
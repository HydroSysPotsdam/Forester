Installation Problems
=====================

During testing we noticed that Forester can currently only be installed when you already have a working installation of R.
Of course working on projects from other origins (Matlab) should not depend on whether you have installed R.

We are working to resolve this issue but this may take a while. We therefore kindly ask you to install R so that you can continue testing Forester. Below you find guidelines to resolve further issues.

.. important:: This page is only temporary until a solution to the underlying problem is found.

Forester does not Run on Windows Even Though R is Installed
-----------------------------------------------------------

This bug is due to a missing PATH variable in Windows. We sadly have no control over it and can therefore only provide you help to resolve this problem yourself.

To resolve this issue, do you need to add two PATH variables.

#. Find your R installation and write down the path to the folders library and bin.
   This could for example be: ``C:\Program Files\R\R-4.2.3\library`` and ``C:\Program Files\R\R-4.2.3\bin``
#. On the Windows taskbar, right-click the Windows icon and select System.
#. In the Settings window, scroll down to Related Settings, click Advanced system settings.
#. On the Advanced tab, click Environment Variables. Click New to create new environment variable.
#. Add a variable with the name *R_LIBRARY* and add the path to the ``library`` folder.
#. Add a variable with the name *R_BIN* and add the path to the ``bin`` folder.
#. Close and re-open the command prompt.
#. Re-run Forester
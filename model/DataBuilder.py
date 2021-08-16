import abc


# Interface for preparing input and output data
class DataBuilder(object):

    @abc.abstractmethod
    def get_x(self):
        """
        Retrieve the feature data
        :return: A matrix X
        """

    @abc.abstractmethod
    def get_y(self):
        """
        Retrieve the target data
        :return: A vector y
        """

    @property
    @abc.abstractmethod
    def classnames(self):
        """
        :return: Should never be reached
        """

    @property
    @abc.abstractmethod
    def featurenames(self):
        """
        :return: Should never be reached
        """
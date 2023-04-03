#  CC-0 2023.
#  David Strahl, University of Potsdam
#  Forester: Interactive human-in-the-loop web-based visualization of machine learning trees

from dataclasses import dataclass, field
from dataclasses_json import dataclass_json


@dataclass
@dataclass_json
class Format:

	type: str
	vendor: str
	origin: str

	deprecated: bool = field(repr=False, default=False)
	faulty: bool = field(repr=False, default=False)

	node: str = field(repr=False, default="")

	def get_format(self):
		return f"{self.type.lower()}.{self.vendor.lower()}.{self.origin.lower()}"
let logger = require('./logger.js');

module.exports = function() {

	global.api = function(endpoint, data) {
		if (global.config.api.url) {
			HTTPEvent.emit("POST", global.config.api.url + endpoint, data);
		}
	};

	global.prettyHex = function(data) {
		var output = "";
		for (var i=0; i<data.length; i++) {
			output += " " + data[i].toString(16);
			if (data[i] < 16) {
				output += "0";
			}
		}

		return output.trim();
	};

	global.swap16 = function(data) {
		return ((data & 0xFF) << 8) | ((data >> 8) & 0xFF);
	}

	global.logDataStream = function(data) {
		// log the binary data stream in rows of 8 bits
		var print = "";
		for (var i = 0; i < data.length; i++) {
			print += " " + data[i].toString(16);

			// apply proper format for bits with value < 16, observed as int tuples
			if (data[i] < 16) { print += "0"; }

			// insert a line break after every 8th bit
			if ((i + 1) % 8 === 0) {
				print += '\n';
			};
		}

		console.log(print);
	}

	if (!String.prototype.format) {
		String.prototype.format = function() {
			let args = arguments;

			return this.replace(/{(\d+)}/g, function(match, number) {
				return typeof args[number] != 'undefined' ? args[number] : match;
			});
		}
	}

	if (!String.prototype.capitalize) {
		String.prototype.capitalize = function() {
			return this.charAt(0).toUpperCase() + this.slice(1);
		}
	}
}

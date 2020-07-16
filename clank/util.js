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

	// Convert a hex string to a byte array
	global.hexToBytes = function(hex) {
		for (var bytes = [], c = 0; c < hex.length; c += 2)
		bytes.push(parseInt(hex.substr(c, 2), 16));
		return bytes;
	}

	// Convert a byte array to a hex string
	global.bytesToHex = function(bytes) {
		for (var hex = [], i = 0; i < bytes.length; i++) {
			var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
			hex.push((current >>> 4).toString(16));
			hex.push((current & 0xF).toString(16));
		}
		return hex.join("");
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

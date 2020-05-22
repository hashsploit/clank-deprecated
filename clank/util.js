let logger = require('./logger.js');

module.exports = function() {

/*
	global.api = function(endpoint, data) {
		if (global.config.api.url) {
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: global.config.log_level == "debug"
			};
			var query = "";
			for (var key in data) {
				query += "&{0}={1}".format(key, encodeURIComponent(data[key]));
			}
			logger.log("debug", "API request to {0}{1} ...".format(global.config.api.url, endpoint));
			request.get("{0}{1}?key={2}{3}".format(global.config.api.url, endpoint, global.config.api.key, query), options,
				function optionalCallback(err, httpResponse) {
					if (err) {
						logger.log("warn", "Failed to broadcast server start to the API!");
						logger.log("warn", err);
					}
				}
			);
		}
	}
*/

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

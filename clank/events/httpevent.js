var logger = require('../logger.js');
var request = require('then-request');
var EventEmitter = require('events');

/* HTTP (GET/POST) Service */
HTTPEvent = new EventEmitter();

// Allow self-signed certificate
if (global.config.log_level == "debug") {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

HTTPEvent.on("POST", (url, body, callback) => {
	try {
		logger.log("debug", "POST::Request -> {0}".format(url), "cyan");
		request("POST", url, {json: body}).done((res) => {
			logger.log("debug", "POST::Response <- {0}".format(url), "cyan");
			if (typeof(callback) == 'function') {
				return callback(res);
			}
		});
	} catch (error) {
		logger.log("error", "Error: {0}".format(error));
	}
});

HTTPEvent.on("GET", (url, callback) => {
	try {
		logger.log("debug", "GET::Request -> {0}".format(url), "cyan");
		request("GET", url).done((res) => {
			logger.log("debug", "GET::Response <- {0}".format(url), "cyan");
			if (typeof(callback) == 'function') {
				return callback(res);
			}
		});
	} catch (error) {
		logger.log("error", "Error: {0}".format(error));
	}
});

module.exports.PostEvent = HTTPEvent;

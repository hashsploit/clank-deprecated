var logger = require('../logger.js');
var request = require('then-request');
var EventEmitter = require('events');

/* HTTP (GET/POST) Service */
HTTPEvent = new EventEmitter();

// Allow self-signed certificate
if (global.config.log_level == "debug") {
	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

HTTPEvent.on("PostRequest", (url, body, callback) => {
	try {
		logger.log("debug", "HTTPRequest::PostRequest -> {0}".format(url));
		request("POST", url, {json: body}).done((res) => {
			logger.log("debug", "HTTPRequest::PostRequest <- {0}".format(url));
			if (typeof(callback) == 'function') {
				return callback(res);
			}
		});
	} catch (error) {
		logger.log("error", "Error: {0}".format(error));
	}
});

HTTPEvent.on("GetRequest", (url, callback) => {
	try {
		logger.log("debug", "HTTPRequest::GetEvent -> {0}".format(url));
		request("GET", url).done((res) => {
			logger.log("debug", "HTTPRequest::GetEvent <- {0}".format(url));
			if (typeof(callback) == 'function') {
				return callback(res);
			}
		});
	} catch (error) {
		logger.log("error", "Error: {0}".format(error));
	}
});

module.exports.PostEvent = HTTPEvent;

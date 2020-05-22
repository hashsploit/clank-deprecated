let chalk = require("chalk");
let currentLogLevel = 0;

let level = {
	"debug": {
		"level": 0,
	},
	"info": {
		"level": 1,
	},
	"warn": {
		"level": 2,
		"color": "yellow"
	},
	"error": {
		"level": 3,
		"color": "red"
	}
};

function getDateString() {
	var date = new Date();
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var seconds = date.getSeconds();
	var millis = date.getMilliseconds();
	var timestamp = ("0" + hours).slice(-2) + ":" + ("0" + minutes).slice(-2) + ":" + ("0" + seconds).slice(-2) + "." + ("00"  + millis).slice(-3);

	return timestamp;
}

function getCallerFile() {
	try {
		Error.prepareStackTrace = function (err, stack) {
			return stack;
		};

		var err = new Error();
		var callerfile;
		var currentfile;

		Error.prepareStackTrace = function(err, stack) {
			return stack;
		};

		currentfile = err.stack.shift().getFileName();

		while (err.stack.length) {
			callerfile = err.stack.shift().getFileName();

			if (currentfile !== callerfile) {
				return callerfile;
			}
		}

	} catch (err) {};

	return undefined;
}

function setLogLevel(logLevel) {
	if (level[logLevel] == null) {
		log("error", "Attempted to set the logger level to an invalid value! Acceptable values are: " + Object.keys(level).join(", "));
		return;
	}
	currentLogLevel = level[logLevel].level;
}

function log(logLevel, message, color) {
	if (logLevel == null || message == null) {
		return;
	}

	if (level[logLevel] == null) {
		log("error", "Attempted to print message \"" + message + "\" with an invalid log level!");
		return;
	}

	// Filter out unessesary
	if (level[logLevel].level < currentLogLevel) {
		return;
	}

	if (color != null) {
		message = chalk[color].bold(message);
	}

	let outputMessage = "[" + Object.keys(level)[level[logLevel].level].toUpperCase() + "/" + getCallerFile().replace(/^.*[\\\/]/, '') + "] " + message;

	if (level[logLevel].color != null) {
		outputMessage = chalk[level[logLevel].color].bold(outputMessage);
	}

	console.log(getDateString() + " " + outputMessage.replace(/(?:\r\n|\r|\n)/g, '\\n'));
}

module.exports.setLogLevel = setLogLevel;
module.exports.log = log;
module.exports.getDateString = getDateString;

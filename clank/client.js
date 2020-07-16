let logger = require('./logger.js');
let network = require('./network.js');

function Client(socket) {
	this.socket = socket;
	this.username;
	this.clientState = 0; // Connection stage (before logged_in is set to true)
	this.operator = false;

	this.start = function() {

	}

	this.send = function(data) {
		network.sendData(this, data);
	}


}

module.exports = Client;

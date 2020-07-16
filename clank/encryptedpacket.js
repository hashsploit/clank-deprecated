let logger = require("./logger.js");
var network = require('./network.js');

let packetId;
let packetLength;
let packetChecksum;
let packetPayload;

class EncryptedPacket {

	constructor(packetId, packetLength, packetChecksum, packetPayload) {
		this.packetId = packetId;
		this.packetLength = packetLength;
		this.packetChecksum = packetChecksum;
		this.packetPayload = packetPayload;
	}

	decrypt() {

	}


}

module.exports = EncryptedPacket;

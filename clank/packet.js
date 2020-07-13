var logger = require('./logger.js');
var network = require('./network.js');
var handler = null;

function start() {

}

function decide(socket, client, data) {

	if (socket == undefined || socket.destroyed || data == null) {
		disconnectClient(client);
		return;
	}

	var parsedPacket = new Parser(data);


}

class Parser {

	constructor(rawData) {
		this.splitPacket = [...rawData];
		this.p_id = this.splitPacket[0];
		this.p_length = this.splitPacket[2] + this.splitPacket[1];
		this.p_data = this.splitPacket.slice(1 + 2 + 4, this.splitPacket.length);
		this.p_checksum = [];
		this.p_checksum.push(this.splitPacket[3]);
		this.p_checksum.push(this.splitPacket[4]);
		this.p_checksum.push(this.splitPacket[5]);
		this.p_checksum.push(this.splitPacket[6]);


		this.isBadPacket = false;

		logger.log("debug", "Incoming Packet -> id:{0} length:{1} checksum:{2} data:{3}".format("0x" + prettyHex([this.p_id]), this.p_length, prettyHex(this.p_checksum), prettyHex(this.p_data)), "yellow");

		// TODO: Check if this is a valid packet (verify length and checksum?)

		if (!this.isBadPacket) {

			// Decrypt packet


			// Process on the current emulation mode
			switch (global.config.mode) {
				case "mas":

				break;

				case "mls":

				break;

				case "mps":

				break;
			}
		}

	}


}

module.exports.start = start;
module.exports.decide = decide;
module.exports.Parser = Parser;

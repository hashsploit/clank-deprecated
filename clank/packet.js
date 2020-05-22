var logger = require('./logger.js');
var network = require('./network.js');
var handler = null;

function start() {
	var Handler = require('./mas/handler.js');
	handler = new Handler();

	// If this is a MLS server use the MLS handler instead
	if (global.config.mode == "mls") {
		handler = require('./mls/handler.js');
	}

	handler.start();
}

function decide(socket, client, data) {

	if (socket == undefined || socket.destroyed || data == null) {
		return;
	}

	// TODO: Check if this is a valid packet (verify length and checksum?)

	new Parser(data, {
		client: client
	});
}

class Parser {
	constructor(rawPacket, world) {
		this.rawPacket = rawPacket;
		this.splitPacket = this.rawPacket.split();
		this.id = this.splitPacket[0];
		this.length = this.splitPacket[2] + this.splitPacket[1];
		this.data = this.rawPacket.slice(3, this.rawPacket.length - 4)
		this.checksum = this.splitPacket[4];
		this.isBadPacket = false;

		logger.log("debug", "Incoming Packet -> id:{0} length:{1} checksum:{2} data:{3}".format(this.id, this.length, this.checksum, this.data), "cyan");

		if (!this.isBadPacket) {
			world.worldConstruct.handle(world.player, rawPacket);
		}
	}
}

module.exports.start = start;
module.exports.decide = decide;
module.exports.Parser = Parser;

var logger = require('./logger.js');
var network = require('./network.js');
var xml_type = require('./login.js');
var xt_type = require('./world.js');

function start() {

}

function decide(socket, player, data) {

	if (data == null) {
		return;
	}

	if (socket == undefined || socket.destroyed) {
		return;
	}

	// TODO: Check if this is a valid packet (verify length and checksum?)

	new Parser(data, {
		player: player
	});
}

class Parser {

	constructor(rawPacket, world) {
		console.log(typeof(rawPacket))
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

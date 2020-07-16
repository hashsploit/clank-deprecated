let logger = require('../logger.js');
let sha1 = require('sha1');

function Checksum(input, packetId) {

	// Compute sha1 hash
	let result = hexToBytes(sha1(input));

	// Inject context inter highest 3 bits
	result[3] = Number((result[3] & 0x1F) | ((packetId & 7) << 5));
	return result.slice(0, 4);
}

module.exports = Checksum;

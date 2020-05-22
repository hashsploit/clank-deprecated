var logger = require("../logger.js");

const CipherContext = Object.freeze({
	
	"ID_00": 0x00,

	"RC_SERVER_SESSION": 0x01,

	"ID_02": 0x02,

	"RC_CLIENT_SESSION": 0x03,

	"ID_04": 0x04,

	"ID_05": 0x05,

	"ID_06": 0x06,

	"RSA_AUTH": 0x07
});

module.exports.Parser = CipherContext;

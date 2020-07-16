let logger = require("./logger.js");
let bigInt = require("big-integer");

class RSA {

	constructor(n, e, d) {
		this.n = bigInt(n);
		this.e = bigInt(e);
		this.d = bigInt(d);
	}


}

module.exports = RSA;

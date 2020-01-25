let logger = require('../../util/logger.js');
let network = require('../../util/network.js');
let Promise = require("bluebird");
let threading = require('threads');

/* DonateCoins - e#dc */
module.exports = function() {

	let DONATION_CAUSE = {};
	DONATION_CAUSE[1] = "Provide Medical Help";
	DONATION_CAUSE[2] = "Build Safe Places";
	DONATION_CAUSE[3] = "Protect The Earth";

	this.startDependency = function() {
	}

	this.donateCoins = function(penguin, data) {

		if (data.length !== 2) {
			network.removePenguin(penguin);
			return;
		}

		if (isNaN(data[0]) || isNaN(data[1])) {
			network.removePenguin(penguin);
			return;
		}

		let donationCause = Number(data[0]);
		let amount = Number(data[1]);

		// Not enough coins
		if (amount > penguin.coins) {
			penguin.send('e', -1, 401);
			return;
		}

		// Subtract coins from player
		penguin.subtractCoins(amount);


		// FIXME: Add entry to database


		logger.log("info", "{0} ({1}) donated {2} coins to {3}".format(penguin.name(), penguin.id, amount, DONATION_CAUSE[donationCause]));
	}

}

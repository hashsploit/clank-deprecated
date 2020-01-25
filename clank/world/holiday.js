var logger = require('../../util/logger.js');
var network = require('../../util/network.js');

/* Holiday - e# or holiday# */
module.exports = function() {
	this.amountTypes = [100, 500, 1000, 5000, 10000];
	this.charities = {
		2: {'name': 'Build Safe Places', charityId: 1},
		3: {'name': 'Protect The Earth', charityId: 2},
		1: {'name': 'Provide Medical Help', charityId: 3}
	};

	this.startDependency = function() {
	}

	this.donateCoinsForChange = function(penguin, data) {
		if (isNaN(data[0]) || isNaN(data[1])) {
			return;
		}

		var categoryId = Number(data[0]);
		var amountType = Number(data[1]);

		// Not in charity categories
		if (charities[categoryId] == undefined) {
			return;
		}

		// Not in amount types
		if (amountTypes.indexOf(amountType) == -1) {
			return;
		}

		// Not enough coins
		if (amountType > penguin.coins) {
			penguin.send('e', penguin.room.internal_id, global.error.NOT_ENOUGH_COINS.id);
			return;
		}

		WebhookEvent.emit('coins_for_change_log', {
			"Player": "`" + penguin.name() + "`" + " [[Modify Player #" + penguin.id + "]](" + global.config.server.website + "/cp/player/" + penguin.id + ")",
			"Server": global.config.server.name + " [[Modify Server]](" + global.config.server.website + "/cp/server/" + global.config.server.name + ")",
			'Charity ID': charities[categoryId].charityId,
			'Charity Name': charities[categoryId].name,
			'Coin Amount': amountType,
			'Player Coins': penguin.coins
		});

		var charity = charities[categoryId].charityId;
		penguin.database.addCFCDonation(penguin.id, charity, Number(amountType));
		penguin.subtractCoins(amountType);
		penguin.send('dc', penguin.room.internal_id, penguin.coins);
	}
}

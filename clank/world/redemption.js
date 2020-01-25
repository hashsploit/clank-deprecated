var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var Promise = require("bluebird");

/* Redemption - red# */
module.exports = function() {
	this.startDependency = function() {
	}

	this.handleRedemptionJoinServer = function(penguin, data) {
		var player_id = data[0];
		var world_hash = data[1];
		var language = data[2];

		//logger.log('[' + global.world_id + '] > ' + penguin.username + ' is trying to join!', 'green');
		logger.log("debug", "Player {0} ({1}) is joining redemption server {2} ({3})".format(penguin.name(), penguin.id, global.config.server.name, global.config.server.id));

		// Spoofing player
		if (Number(player_id) !== Number(penguin.id)) {
			network.removePenguin(penguin);
			return;
		}

		// Language: English
		if (language !== 'en') {
			network.removePenguin(penguin);
			return;
		}

		if (world_hash == '') {
			network.removePenguin(penguin);
			return;
		}

		penguin.database.get_column(penguin.id, 'login_key', function(db_key) {
			if (db_key !== world_hash) {
				penguin.send('e', -1, 101);
				network.removePenguin(penguin);
				return;
			}

			penguin.loadPenguin(function() {
				penguin.send('rjs', -1, 1, 0, 1);
			});
		});
	}

	this.handleRedemptionSendCode = function(penguin, data) {
		var unlockCode = data[0];

		//logger.log(penguin.name() + ' is trying to unlock ' + unlockCode, 'green');
		logger.log("debug", "Player {0} ({1}) is attempting to redeem '{2}'".format(penguin.name(), penguin.id, unlockCode));

		penguin.database.unlockCodeExists(unlockCode, function(exists) {
			if (!exists) {
				penguin.send('e', -1, 720);
				return;
			}

			penguin.database.getUnlockCodeByName(unlockCode, function(id, name, type, items, coins, expired, redeemed) {
				var redeemedArray = redeemed.split(',');
				var itemsArray = items.split(',');

				if (Number(expired) == 1) {
					logger.log("info", "Player {0} ({1}) attempted to redeem expired code '{2}'".format(penguin.name(), penguin.id, unlockCode));
					penguin.send('e', -1, 726);
					return;
				}

				if (redeemedArray.indexOf(String(penguin.id)) >= 0) {
					//already redeemed!
					logger.log("info", "Player {0} ({1}) attempted to redeem expired code '{2}'".format(penguin.name(), penguin.id, unlockCode));
					penguin.send('e', -1, 721);
					return;
				}

				if (type == 'BLANKET') {
					penguin.database.updateUnlockCode(id, 'expired', 1);
				}

				redeemedArray.push(String(penguin.id));

				if (Number(coins) > 0) {
					penguin.addCoins(coins);
				}

				Promise.each(itemsArray, (item) => {
					penguin.inventory.push(item);
				}).then(() => {
					penguin.database.update_column(penguin.id, 'inventory', penguin.inventory.join('%'), function() {
						logger.log("info", "Player {0} ({1}) successfully redeemed code '{2}'".format(penguin.name(), penguin.id, unlockCode), "green");
						penguin.database.updateUnlockCode(id, 'redeemed', redeemedArray.join(','));
						penguin.send('rsc', -1, type, items, coins);
					});
				});
			});
		});
	}
}

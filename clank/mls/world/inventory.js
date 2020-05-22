var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var Promise = require("bluebird");

var _eventWhitelist = require('../../crumbs/whitelist/event.json');
var whitelistEnabled = _eventWhitelist['enabled'];
var month = _eventWhitelist['month'];
var lastMonth = _eventWhitelist['lastMonth'];
var itemList = _eventWhitelist['items'];
var datesArray = [];
var itemsArray = [];
var eventWhitelist = {};

for (var index in itemList) {
	var availableDate = index;
	var itemId = itemList[index];

	datesArray.push(availableDate);
	itemsArray.push(itemId);

	eventWhitelist[itemId] = {itemId: itemId, availableDate: index, month: month, lastMonth: lastMonth};
}

require('./mail.js')();

/* Inventory - i# */
module.exports = function() {
	this.startDependency = function() {
	}

	this.getInventory = function(penguin, data) {
		let inventory = penguin.inventory.filter((e, p) => penguin.inventory.indexOf(e) == p); //removes dupes
		penguin.send('gi', -1, inventory.join('%'));
	}

	this.canObtainEventItem = function(itemId) {
		var currentDate = new Date();

		// Current date
		currentDate.setHours(currentDate.getHours() - 7);

		if (whitelistEnabled == false) {
			return false;
		}

		if (itemsArray.indexOf(Number(itemId)) == -1) {
			return false;
		}

		if (currentDate.getMonth() == 0) {
			return true;
		}

		if (currentDate.getDate() < eventWhitelist[itemId].availableDate) {
			return false;
		}

		return true;
	}

	this.buyInventory = function(penguin, data) {
		var itemId = data[0];

		// If item does not exist
		if (global.items[itemId] == undefined) {
			penguin.send('e', penguin.room.internal_id, global.error.ITEM_NOT_EXIST.id);
			return;
		}

		// If already in inventory
		if (penguin.inventory.indexOf(itemId) >= 0) {
			penguin.send('e', penguin.room.internal_id, global.error.ITEM_IN_HOUSE.id);
			return;
		}

		var cost = global.items[itemId][0];
		var name = global.items[itemId][1];
		var whitelisted = global.items[itemId][2];

		if (whitelisted !== true && canObtainEventItem(itemId) !== true) {
			WebhookEvent.emit('buy_log', {
				"Type": 'Illegal Item',
				"Player": "`" + penguin.name() + "`" + " [[Modify Player #" + penguin.id + "]](" + global.config.server.website + "/cp/player/" + penguin.id + ")",
				"Server": global.config.server.name + " [[Modify Server]](" + global.config.server.website + "/cp/server/" + global.config.server.name + ")",
				"Item ID": itemId,
				"Item Name": name,
				"Item Cost": cost,
				"Room": "#{0} {1} ({2})".format(penguin.room.external_id, penguin.room.name, penguin.room.display_name),
				"Action": "Denied"
			});

			// if item doesn't exist (not available at the current time)
			penguin.send('e', penguin.room.internal_id, global.error.ITEM_NOT_EXIST.id);
			return;
		}

		// Not enough coins
		if (penguin.coins < cost) {
			penguin.send('e', penguin.room.internal_id, global.error.NOT_ENOUGH_COINS.id);
			return;
		}

		switch(Number(itemId)) {
			case 428:
				// Tour guide
				sendSystemMail(penguin, penguin.id, '', 126);
				break;
			case 800:
				// PSA
				sendSystemMail(penguin, penguin.id, '', 127);
				break;
		}

		penguin.addItem(itemId, cost);
	}

	this.getPlayerPins = async function(penguin, data) {
		let playerId = Number(data[0]);
		let playerExists = await penguin.database.engine.playerIdExists(playerId);
		let pinsArray = [];
		let playerInventory;

		if (isNaN(playerId) || !playerExists) {
			return;
		}

		if (playerId == penguin.id) {
			playerInventory = penguin.inventory;
		} else {
			playerInventory = await penguin.database.engine.getColumnById(playerId, 'inventory');
			playerInventory = playerInventory.split('%');
		}

		Promise.each(global.pinArr, (pinId) => {
			let timestamp = global.pins[pinId][2];

			if (playerInventory.indexOf(String(pinId)) >= 0) {
				pinsArray.push([pinId, timestamp, 0].join('|'));
			}
		}).then(() => {
			penguin.send('qpp', -1, pinsArray.join('%'));
		});
	}

	this.getPlayerAwards = async function(penguin, data) {
		let playerId = Number(data[0]);
		let playerExists = await penguin.database.engine.playerIdExists(playerId);
		let playerInventory;

		if (!playerExists) {
			return;
		}

		if (playerId == penguin.id) {
			playerInventory = penguin.inventory;
		} else {
			playerInventory = await penguin.database.engine.getColumnById(playerId, 'inventory');
			playerInventory = playerInventory.split('%');
		}

		let awardsArray = await Promise.filter(playerInventory, (a) => Object.keys(global.awards).indexOf(a) >= 0);

		penguin.send('qpa', -1, playerId, awardsArray.join('|'));
	}
}

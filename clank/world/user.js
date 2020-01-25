var logger = require('../../util/logger.js');
var network = require('../../util/network.js');

/* User - u# */
module.exports = function() {

	this.startDependency = function() {
	}

	this.sendHeartbeat = function(penguin, data) {
		penguin.send('h', penguin.room.internal_id);
	}

	this.sendLastRevision = function(penguin, data) {
		penguin.send('glr', -1, global.name + " " + global.version);
	}

	this.sendEmote = function(penguin, data) {
		var emote_id = data[0];

		if (isNaN(emote_id)) {
			network.removePenguin(penguin);
			return;
		}

		if (penguin.muted) {
			return;
		}

		penguin.room.send(penguin, 'se', penguin.room.internal_id, penguin.id, emote_id);
	}

	this.sendSafeChat = function(penguin, data) {
		var id = data[0];

		if (isNaN(id)) {
			network.removePenguin(penguin);
			return;
		}

		if (penguin.muted) {
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou may not chat, you are muted.");
			return;
		}

		penguin.room.send(penguin, 'ss', penguin.room.internal_id, penguin.id, id);
	}

	this.sendLine = function(penguin, data) {
		var id = data[0];

		if (isNaN(id)) {
			network.removePenguin(penguin);
			return;
		}

		if (penguin.muted) {
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou may not chat, you are muted.");
			return;
		}

		penguin.room.send(penguin, 'sl', penguin.room.internal_id, penguin.id, id);
	}

	this.sendJoke = function(penguin, data) {
		var id = data[0];

		if (isNaN(id)) {
			network.removePenguin(penguin);
			return;
		}

		if (penguin.muted) {
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou may not send jokes, you are muted.");
			return;
		}

		penguin.room.send(penguin, 'sj', penguin.room.internal_id, penguin.id, id);
	}

	this.sendTourMessage = function(penguin, data) {
		var id = data[0];

		if (isNaN(id)) {
			network.removePenguin(penguin);
			return;
		}

		if (penguin.muted) {
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou may not give a tour, you are muted.");
			return;
		}

		penguin.room.send(penguin, 'sg', penguin.room.internal_id, penguin.id, id);
	}

	this.sendPosition = function(penguin, data) {
		var x = data[0];
		var y = data[1];

		if (isNaN(x) || isNaN(y)) {
			network.removePenguin(penguin);
			return;
		}

		penguin.x = Number(x);
		penguin.y = Number(y);

		// Reset the player "coin dig update" counter
		penguin.cdu = 0;

		penguin.room.send(penguin, 'sp', penguin.room.internal_id, penguin.id, penguin.x, penguin.y);
	}

	this.sendTeleport = function(penguin, data) {
		var x = data[0];
		var y = data[1];

		if (isNaN(x) || isNaN(y)) {
			network.removePenguin(penguin);
			return;
		}

		penguin.x = Number(x);
		penguin.y = Number(y);

		penguin.room.send(penguin, 'tp', penguin.room.internal_id, penguin.id, penguin.x, penguin.y);
	}

	this.sendSnowball = function(penguin, data) {
		var x = data[0];
		var y = data[1];

		if (isNaN(x) || isNaN(y)) {
			network.removePenguin(penguin);
			return;
		}

		penguin.room.send(penguin, 'sb', penguin.room.internal_id, penguin.id, x, y);
	}

	this.sendFrame = function(penguin, data) {
		var frame = data[0];

		if (isNaN(frame)) {
			network.removePenguin(penguin);
		}

		penguin.frame = Number(frame);

		penguin.room.send(penguin, 'sf', penguin.room.internal_id, penguin.id, penguin.frame);
	}

	this.sendAction = function(penguin, data) {
		var actionId = data[0];

		if (isNaN(actionId)) {
			network.removePenguin(penguin);
			return;
		}

		penguin.room.send(penguin, 'sa', penguin.room.internal_id, penguin.id, actionId);
	}

	this.getPlayer = function(penguin, data) {
		var playerId = data[0];

		if (isNaN(playerId)) {
			return;
		}

		if (penguin.buddiesById[playerId] == undefined) {
			return;
		}

		penguin.database.playerIdExists(playerId, function(result) {
			if (!result) {
				return;
			}

			var playerDetails = [];

			penguin.database.get_columns(playerId, ['id', 'username', 'color', 'head', 'face', 'neck', 'body', 'hand', 'feet', 'flag', 'photo', 'is_approved'], function(result) {
				let playerName = result['username'];

				if (Number(result['is_approved']) == 0) {
					playerName = 'P' + result['id'];
				}

				playerDetails.push(
					result['id'],
					playerName,
					45,
					result['color'],
					result['head'],
					result['face'],
					result['neck'],
					result['body'],
					result['hand'],
					result['feet'],
					result['flag'],
					result['photo'],
					146
				);

				penguin.send('gp', penguin.room.internal_id, playerDetails.join('|'));
			});
		});
	}

	this.coinsDigUpdate = function(penguin, data) {

		if (penguin.room.name !== "cavemine" || penguin.frame !== 26) {
			return;
		}

		const MAX_CDU = 10; // Default 5
		const MIN_COINS = 5; // Default 5
		const MAX_COINS = 10; // Default 25

		if (penguin.cdu > MAX_CDU) {
			return;
		}

		var coinsEarned = Math.floor(Math.random() * (MAX_COINS) + MIN_COINS);

		penguin.addCoins(coinsEarned);
		penguin.cdu++;

		penguin.send('cdu', penguin.room.internal_id, coinsEarned, penguin.coins);
	}

	return this;
}

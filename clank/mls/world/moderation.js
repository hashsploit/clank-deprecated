var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var fs = require('fs');

/* Moderation - o# */
module.exports = function() {

	this.startDependency = function() {
	}

	this.kickPlayerById = function(penguin, data) {
		let playerId = data[0];

		// Permisson level 2 (moderator)
		if (penguin.permission >= 2) {

			if (!isNaN(playerId)) {
				if (penguinsById[playerId] !== undefined) {
					kickPlayer(penguinsById[playerId]);
					logger.log("info", "Moderator {0} ({1}) kicked {2} from the server".format(penguin.name(), penguin.id, playerId));
				} else {
					penguin.send('mm', penguin.room.internal_id, "Player #" + playerId + " is offline or on another server.", -1);
					penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "Player <u><a href='" + global.config.server.website + "/cp/player/" + playerId + "' target='_blank'>#" + playerId + "</a></u> is offline or on another server.");
				}
			}
		} else {
			logger.log("warn", "Non-moderator {0} ({1}) attempted to kick player {2}".format(penguin.name(), penguin.id, playerId));
		}

	}

	// System ban action
	this.banPlayer = function(penguin, reason) {
		let timestamp = new Date();

		timestamp.setHours(timestamp.getHours() + 24);

		timestamp = timestamp.getTime() / 1000;

		//penguin.database.update_column(penguin.id, 'Banned', timestamp);

		logger.log("info", "System temp-banned player {0} ({1}) for 24-hours for reason \"{2}\"".format(penguin.name(), penguin.id, reason));

		// Ban a player with the moderatorId, playerId, reason, expires
		penguin.database.banPlayerById(0, penguin.id, reason, timestamp);

		// Send client "banned for 24 hours for reason"
		penguin.send('e', penguin.room.internal_id, global.error.AUTO_BAN.id, reason);

		network.removePenguin(penguin);
		return;
	}

	this.kickPlayer = function(penguin) {

		// TODO: Add reason
		penguin.send('e', penguin.room.internal_id, global.error.KICK.id);

		logger.log("info", "System kicked player {0} ({1})".format(penguin.name(), penguin.id));

		network.removePenguin(penguin);
		return;
	}

	// Moderator ban action
	this.banPlayerAction = function(penguin, data) {

		// If sender is not a moderator
		if (penguin.permission <= 1) {
			logger.log("warn", "Non-moderator {0} ({1}) attempted to ban a player.");
			network.removePenguin(player);
			return;
		}

		let playerId = data[0];
		let message = data[1];
		let timestamp = new Date();
		let hoursBanned = 24;

		timestamp.setHours(timestamp.getHours() + hoursBanned);
		timestamp = Math.floor(timestamp.getTime() / 1000);

		let otherPenguin = penguinsById[Number(playerId)];

		if (otherPenguin !== undefined) {
			logger.log("info", "Moderator {0} temp-banned player {1} ({2}) for 24-hours for saying \"{3}\"".format(penguin.name(), otherPenguin.name(), otherPenguin.id, message));

			// Ban a player with the moderatorId, playerId, reason, expires
			penguin.database.banPlayerById(penguin.id, otherPenguin.id, "For saying: \"{0}\"".format(message), timestamp);

			// Send client "banned for 24 hours"
			otherPenguin.send('e', otherPenguin.room.internal_id, global.error.BAN_AN_HOUR.id, hoursBanned);

			network.removePenguin(otherPenguin);
			return;
		}

		penguin.send('mm', penguin.room.internal_id, "Player #" + playerId + " is offline or on another server.", -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer <u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u> is offline or on another server.");
		return;
	}

	this.mutePlayerById = function(penguin, data) {
		// If player is a moderator
		if (penguin.permission >= 2) {
			var playerId = data[0];

			if (!isNaN(playerId)) {
				if (penguinsById[playerId] !== undefined) {
					// Toggle
					penguinsById[playerId].muted = !penguinsById[playerId].muted;
					logger.log("info", "Moderator {0} ({1}) {2} player {3}".format(penguin.name(), penguin.id, (penguinsById[playerId].muted ? "muted" : "un-muted"), playerId));
					penguin.send('mm', penguin.room.internal_id, "Player '{0}' (#{1}) is now {2}.".format(penguinsById[playerId].name(), playerId, (penguinsById[playerId].muted ? "muted" : "un-muted")), -1);
					penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "Player '" + penguinsById[playerId].name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + playerId + "' target='_blank'>#{0}</a></u>) is now {1}.".format(playerId, (penguinsById[playerId].muted ? "muted" : "un-muted")));
				} else {
					penguin.send('mm', penguin.room.internal_id, "Player #{0} is offline or on another server.".format(playerId), -1);
					penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "Player <u><a href='" + global.config.server.website + "/cp/player/" + playerId + "' target='_blank'>#" + playerId + "</a></u> is offline or on another server.");
				}

			}
		}

	}
}

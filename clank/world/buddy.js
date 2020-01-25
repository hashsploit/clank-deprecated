var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var Promise = require("bluebird");

/* Buddies - b# */
module.exports = function() {

	this.startDependency = function() {
	}

	this.addBuddy = function(penguin, buddyId) {
		if (isNaN(buddyId) || penguin.id == Number(buddyId) || penguin.buddyRequests[Number(buddyId)] == undefined) {
			return;
		}

		if (penguinsById[buddyId] == undefined) {
			return;
		}

		delete penguin.buddyRequests[Number(buddyId)];

		let buddy = penguinsById[buddyId];

		penguin.buddies.push(buddy.id + "");
		buddy.buddies.push(penguin.id + "");

		penguin.buddiesById[buddyId] = buddy.name();
		buddy.buddiesById[penguin.id] = penguin.name();

		penguin.buddylist[buddyId] = {id: buddyId, nickname: buddy.name(), online: 1};
		buddy.buddylist[penguin.id] = {id: penguin.id, nickname: penguin.name(), online: 1};

		penguin.database.update_column(penguin.id, 'buddies', penguin.buddies.join(',').replace(/(^[,\s]+)|([,\s]+$)/g, ''));
		penguin.database.update_column(buddy.id, 'buddies', buddy.buddies.join(',').replace(/(^[,\s]+)|([,\s]+$)/g, ''));

		buddy.send('ba', buddy.room.internal_id, penguin.id, penguin.name());
		penguin.send('ba', penguin.room.internal_id, buddy.id, buddy.name());
	}

	this.removeOnlineBuddy = function(penguin, buddyId) {
		if (isNaN(buddyId) || penguin.id == Number(buddyId)) {
			return;
		}

		let buddy = penguinsById[buddyId];
		let indexPenguin = penguin.buddies.indexOf(buddy.id + "");
		let indexBuddy = buddy.buddies.indexOf(penguin.id + "");

		if (indexPenguin == -1 || indexBuddy == -1) {
			return;
		}

		penguin.buddies.splice(indexPenguin, 1);
		buddy.buddies.splice(indexBuddy, 1);

		delete penguin.buddiesById[buddyId];
		delete buddy.buddiesById[penguin.id];

		delete penguin.buddylist[buddyId];
		delete buddy.buddylist[penguin.id];

		penguin.database.update_column(penguin.id, 'buddies', penguin.buddies.join(','));
		penguin.database.update_column(buddy.id, 'buddies', buddy.buddies.join(','));

		// Tell other client to remove their contact
		buddy.send('rb', buddy.room.internal_id, penguin.id, penguin.name());
	}

	this.removeOfflineBuddy = function(penguin, buddyId) {
		if (isNaN(buddyId) || penguin.id == Number(buddyId)) {
			return;
		}

		const _index = penguin.buddies.indexOf(buddyId + "");
		penguin.buddies.splice(_index, 1);
		penguin.database.update_column(penguin.id, 'buddies', penguin.buddies.join(','));

		penguin.database.get_column(buddyId, 'buddies', function(result) {
			const buddies = result.split(',');
			const _index = buddies.indexOf(buddyId + "");

			buddies.splice(_index, 1);

			penguin.database.update_column(buddyId, 'buddies', buddies.join(','));
		});
	}

	this.sendBuddyRequest = function(penguin, data) {
		let buddyId = data[0];

		if (isNaN(buddyId)) {
			return;
		}

		if (penguin.buddyRequests[Number(buddyId)] !== undefined) {
			return;
		}

		if (penguin.buddiesById[Number(buddyId)] !== undefined) {
			return;
		}

		if (penguinsById[buddyId] !== undefined) {
			var buddy = penguinsById[buddyId];

			if (buddy.ignoresById[penguin.id] !== undefined) {
				return;
			}

			buddy.buddyRequests[penguin.id] = [penguin.name()];
			buddy.send('br', penguin.room.internal_id, penguin.id, penguin.name());
		}
	}

	this.sendBuddyRemove = function(penguin, data) {
		var buddyId = data[0];

		if (isNaN(buddyId)) {
			return;
		}

		if (penguin.buddiesById[Number(buddyId)] == undefined) {
			return;
		}

		if (penguinsById[buddyId] !== undefined) {
			removeOnlineBuddy(penguin, Number(buddyId));
		} else {
			removeOfflineBuddy(penguin, Number(buddyId));
		}
	}

	this.acceptBuddy = function(penguin, data) {
		var buddyId = data[0];

		if (isNaN(buddyId)) {
			return;
		}

		if (penguin.buddiesById[Number(buddyId)] !== undefined) {
			return;
		}

		if (penguin.buddies.length >= 200) {
			penguin.send('e', penguin.room.internal_id, 901);
			return;
		}

		addBuddy(penguin, Number(buddyId));
	}

	this.getBuddies = function(penguin, data) {
		if (penguin.buddies == undefined) {
			penguin.send('gb', -1);

			logger.log("warn", "Buddies undefined for {0} ({1})".format(penguin.name(), penguin.id));
			return;
		}

		if (penguin.buddies.length == 0) {
			penguin.send('gb', -1);
			return;
		}

		let buddies = [];

		let nameList = penguin.buddies.join("','");

		penguin.database.getMyBuddies(nameList, ['id', 'username', 'is_approved'], function(rows) {
			Promise.each(rows, (row) => {
				let buddyId = Number(row['id']);
				let buddyName = String(row['username']);
				let online = 0;

				if (Number(row['is_approved']) == 0) {
					buddyName = 'P' + buddyId;
				}

				if (penguinsById[buddyId] !== undefined) {
					online = 1;
				}

				var buddyDetails = [buddyId, buddyName, online];

				penguin.buddylist[buddyId] = {id: buddyId, username: buddyName, online: online};
				penguin.buddiesById[buddyId] = buddyName;

				buddies.push(buddyDetails.join('|'));
			}).then(() => {
				penguin.send('gb', -1, buddies.join('%'));

				sendBuddyOnline(penguin);
			});
		});
	}

	this.sendBuddyOnline = function(penguin) {
		if (penguin.buddies.length == 0) {
			return;
		}

		if (penguin.buddylist == undefined || penguin.buddylist == null) {
			return;
		}

		let buddylistKeys = Object.keys(penguin.buddylist);

		Promise.each(buddylistKeys, (buddyId) => {
			if (penguinsById[buddyId] !== undefined) {
				penguinsById[buddyId].send('bon', -1, penguin.id);
			}
		});
	}

	// TODO: Add moderator hide functionality
	this.findBuddy = function(penguin, data) {
		if (isNaN(data[0])) {
			return;
		}

		var buddyId = Number(data[0]);

		// If buddyId is not in the penguin's buddy list
		if (penguin.buddiesById[buddyId] == undefined) {
			penguin.send('bf', penguin.room.internal_id, -1); //offline
			return;
		}

		// If buddy is not offline
		if (penguinsById[buddyId] !== undefined) {
			// If buddy is a moderator and is hiding
			if (penguinsById[buddyId].hiding) {
				// State buddy is offline
				var extRoomId = -1;
				for (let index in global.rooms) {
					let room = global.rooms[index];
					if (!room) {
						continue;
					}
					// Inactive rooms, Game rooms, and Igloo rooms should be ignored
					if (!room.is_active || room.is_game || room.is_igloo) {
						continue;
					}
					// EPF Agent command room ("player is hiding")
					if (room.name == "agentcom") {
						extRoomId = room.external_id;
					}
				}
				penguin.send('bf', penguin.room.internal_id, extRoomId);
				return;
			}
			penguin.send('bf', penguin.room.internal_id, penguinsById[buddyId].room.external_id);
		}
	}

	return this;
}

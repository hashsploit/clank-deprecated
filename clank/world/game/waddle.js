var logger = require('../../../util/logger.js');
var network = require('../../../util/network.js');
var room = require('../../room.js');
var Promise = require("bluebird");
var EventEmitter = require('events');

/* Games - z# */
module.exports = function() {
	this.roomByWaddle = {};
	this.waddlesById = {};
	this.waddlePlayers = {};
	this.waddleRooms = {};
	this.waddleConnections = {};
	this.waddlePlayerStrings = {};
	this.waddleRoomId = 9;

	WaddleEvent = new EventEmitter();

	require('./sledracing.js')();
	require('./cardjitsu.js')();
	require('./cardjitsufire.js')();
	require('./cardjitsuwater.js')();
	require('./dancecontest.js')();
	require('./multiplayer.js')();

	this.handleGetWaddles = async function(penguin, data, room=false) {
		let waddleIds = data;
		let pseudoRoomId = penguin.room.external_id;

		// FIXME: Hack to fix waddle games
		for (let i in global.rooms) {
			if (global.rooms[i].name == penguin.room.name) {
				if (waddlesById[i] !== undefined) {
					pseudoRoomId = i;
				}
			}
		}

		try {
			let waddlePopulation = await Promise.map(waddleIds, (wid) => [wid, waddlesById[pseudoRoomId][wid].join(',')].join('|'));

			if (room == true) {
				penguin.room.send(penguin, 'gw', penguin.room.internal_id, waddlePopulation.join('%'));
			} else {
				penguin.send('gw', penguin.room.internal_id, waddlePopulation.join('%'));
			}
		} catch(err) {
			logger.log("warn", "Failed to find waddle ID's {0} for room {1}: ".format(waddleIds, pseudoRoomId));
		}

	}

	this.handleSendJoinWaddleById = function(penguin, data) {
		let waddleId = data[0];
		let pseudoRoomId = penguin.room.external_id;

		// FIXME: Hack to fix waddle games
		for (let i in global.rooms) {
			if (global.rooms[i].name == penguin.room.name) {
				if (waddlesById[i] !== undefined) {
					pseudoRoomId = i;
				}
			}
		}


		let penguinSeat = waddlesById[pseudoRoomId][waddleId].indexOf('');

		if (penguin.inWaddle) {
			leaveWaddle(penguin);
			return;
		}

		leaveWaddle(penguin);

		if (penguinSeat == -1) {
			logger.log("warn", "Waddle {0} is full ({1})".format(waddleId, penguin.name()));
			return;
		}

		if (waddlesById[pseudoRoomId][waddleId][penguinSeat] == undefined) {
			logger.log("warn", "Waddle {0} is full ({1})".format(waddleId, penguin.name()));
			return;
		}

		if (waddlesById[pseudoRoomId][waddleId][penguinSeat] !== '') {
			logger.log("warn", "Waddle Space is taken {0} ({1})".format(waddleId, penguin.name()));
			return;
		}

		if (penguinSeat > waddlesById[pseudoRoomId][waddleId].length) {
			logger.log("warn", "Waddle {0} is full ({1})".format(waddleId, penguin.name()));
			return;
		}

		if (waddlePlayers[pseudoRoomId][waddleId] == undefined) {
			waddlePlayers[pseudoRoomId][waddleId] = [];
		}

		waddlePlayers[pseudoRoomId][waddleId][penguinSeat] = penguin;
		waddlesById[pseudoRoomId][waddleId][penguinSeat] = penguin.name();

		penguin.inWaddle = true;
		penguin.waddleRoomId = pseudoRoomId;

		penguin.send('jw', penguin.room.internal_id, penguinSeat);

		penguin.room.send(penguin, 'uw', penguin.room.internal_id, waddleId, penguinSeat, penguin.name());

		if (waddlesById[pseudoRoomId][waddleId].indexOf('') == -1) {
			startWaddle(penguin, waddleId);
		}
	}

	this.startWaddle = function(penguin, waddleId) {
		waddleRoomId++;
		let pseudoRoomId = penguin.room.external_id;

		// FIXME: Hack to fix waddle games (replace id with original id by indexing same room names)
		for (let i in global.rooms) {
			if (global.rooms[i].name == penguin.room.name) {
				if (waddlesById[i] !== undefined) {
					pseudoRoomId = i;
				}
			}
		}

		if (roomByWaddle[pseudoRoomId][waddleId] == undefined) {
			logger.log("warn", "Game Room is not defined, caused by {0} ({1}) in room {2} ({3})".format(penguin.name(), penguin.id, pseudoRoomId, penguin.room.name));
			return;
		}

		let roomId = roomByWaddle[pseudoRoomId][waddleId];
		let externalId = Math.floor(((waddleRoomId + waddleId + roomId + penguin.id) * 12) / 10);
		let internalId = global.rooms[pseudoRoomId].internal_id;
		let seatCount = waddlesById[pseudoRoomId][waddleId].length;



		if (global.rooms[externalId] == undefined) {
			logger.log("debug", "Creating a new game room EXTID:{0} INTID:{1} RID:{2}".format(externalId, internalId, roomId));
			waddleRooms[externalId] = new room(roomId, internalId, seatCount, false, false, 'WaddleGame', false);
		} else {
			logger.log("warn", "Waddle room {0} already exists!".format(roomId));
			return;
		}

		waddlePlayerStrings[pseudoRoomId][waddleId] = [];

		var eventEmit = 'StartWaddle-' + String(roomId);
		WaddleEvent.emit(eventEmit, externalId, waddleId, pseudoRoomId);

		handleGetWaddles(penguin, Object.keys(waddlesById[pseudoRoomId]), true);
	}

	this.joinWaddle = function(penguin, data) {
		let roomId = Number(data[0]);

		penguin.send('jx', penguin.room.internal_id, roomId);
		penguin.room.remove(penguin);

		if (penguin.waddleRoom !== null) {
			if (waddleRooms[penguin.waddleRoom] !== undefined) {
				waddleRooms[penguin.waddleRoom].add(penguin);
			}
		}
	}

	this.handleLeaveWaddle = function(penguin, data) {
		leaveWaddle(penguin);
	}

	this.leaveWaddle = function(penguin) {
		let pseudoRoomId = penguin.room.external_id;

		// FIXME: Hack to fix waddle games
		for (let i in global.rooms) {
			if (global.rooms[i].name == penguin.room.name) {
				if (waddlesById[i] !== undefined) {
					pseudoRoomId = i;
				}
			}
		}


		for (var index in waddlePlayers[pseudoRoomId]) {
			for (var _index in waddlePlayers[pseudoRoomId][index]) {
				if (penguin == waddlePlayers[pseudoRoomId][index][_index]) {
					var waddleId = index;
					var penguinSeat = _index;

					if (waddlesById[pseudoRoomId][waddleId][penguinSeat] !== undefined) {
						waddlesById[pseudoRoomId][waddleId][penguinSeat] = '';
					}

					penguin.room.send(penguin, 'uw', penguin.room.internal_id, waddleId, penguinSeat);
					break;
				}
			}
		}

		//penguin.waddleRoom = null;
		//penguin.waddleId = null;
		penguin.playerSeat = null;
		penguin.inWaddle = false;
		penguin.waddleRoomId = pseudoRoomId;
	}
}

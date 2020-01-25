let logger = require('../../../util/logger.js');
let network = require('../../../util/network.js');
let range = require("range").range;
let Promise = require("bluebird");

/* Dance Contest Instance */
module.exports = function() {
	let movement = {};
	movement.left = 19;
	movement.right = 23;
	movement.up = 21;
	movement.bottom = 17;

	this.danceLobby = {};
	this.danceLobby[0] = {players: {}, roomid: 1456, waitTime: -1}; // Easy
	this.danceLobby[1] = {players: {}, roomid: 1457, waitTime: -1}; // Medium
	this.danceLobby[2] = {players: {}, roomid: 1458, waitTime: -1}; // Hard
	this.danceLobby[3] = {players: {}, roomid: 1459, waitTime: -1}; // Extreme
	this.danceRooms = {};
	this.danceLevels = ['easy', 'medium', 'hard', 'extreme'];

	WaddleEvent.on('StartWaddle-952', (penguin, data) => {

	});

	WaddleEvent.on('ChangeDifficulty-952', (penguin, data) => {
		logger.log("info", "[MiniGame] Dance Contest: {0} ({1}) started a game".format(penguin.name(), penguin.id));

		if (isNaN(data[0])) {
			network.removePenguin(penguin);
			return;
		}

		let level = Number(data[0]);

		if (level < 0 || level > 3) {
			network.removePenguin(penguin);
			return;
		}

		logger.log("info", "[MiniGame] Dance Contest: {0} ({1}) is joining lobby {2}".format(penguin.name(), penguin.id, this.danceLevels[level]));

		if (Object.keys(this.danceLobby[level].players).length == 0) {
			this.danceLobby[level].roomid++;
			this.danceRooms[this.danceLobby[level].roomid] = {songid: Math.floor((Math.random() * 5) + 0)};
		}

		if (Object.keys(this.danceLobby[level].players).length >= 4) {
			penguin.send('jz', penguin.room.internal_id, this.danceLobby[level].roomid, false);
			return;
		}

		this.danceLobby[level].players[penguin.name()] = penguin;
		// 1.5 minutes
		let waitTime = 100000;
		waitTime = 3000;

		setTimeout(function() {
			let noteTimes = 20;
			let noteTypes = 4;
			let noteLengths = 30;
			let millisPerBar = 6000;
			penguin.send('sz', penguin.room.internal_id, noteTimes, noteTypes, noteLengths, millisPerBar);
		}, waitTime);


		penguin.send('jz', penguin.room.internal_id, true, this.danceRooms[this.danceLobby[level].roomid].songid, waitTime);


		// 1.5 minute wait time
		let wait_time = 100000;




		penguin.send('jz', penguin.room.internal_id, true, this.danceRooms[this.danceLobby[level].roomid].songid, wait_time);
	});




	WaddleEvent.on('AbortGame-952', (penguin, data) => {
		logger.log("info", "[MiniGame] Dance Contest: {0} ({1}) is leaving lobby".format(penguin.name(), penguin.id));

		Promise.each(Object.keys(this.danceLobby), level => {
			if (this.danceLobby[level].players[penguin.name()] != undefined) {
				delete this.danceLobby[level].players[penguin.name()];

				//update lobby players

				penguin.send('cz', penguin.room.internal_id);
			}
		});
	});

	this.addPlayerToDanceRoom = function(difficulty, penguin, ) {

	}




}

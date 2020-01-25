var logger = require('../../../util/logger.js');
var network = require('../../../util/network.js');
var TreasureHunt = require('./matches/treasurehunt.js');
var Promise = require("bluebird");

/* Find Four Instance */
module.exports = function() {
	this.tablesById[300] = [];
	this.tablesById[301] = [];
	this.tablesById[302] = [];
	this.tablesById[303] = [];
	this.tablesById[304] = [];
	this.tablesById[305] = [];
	this.tablesById[306] = [];
	this.tablesById[307] = [];

	this.roomByTable[300] = 340;
	this.roomByTable[301] = 340;
	this.roomByTable[302] = 340;
	this.roomByTable[303] = 340;
	this.roomByTable[304] = 340;
	this.roomByTable[305] = 340;
	this.roomByTable[306] = 340;
	this.roomByTable[307] = 340;

	this.gameByTable[300] = 'TreasureHunt';
	this.gameByTable[301] = 'TreasureHunt';
	this.gameByTable[302] = 'TreasureHunt';
	this.gameByTable[303] = 'TreasureHunt';
	this.gameByTable[304] = 'TreasureHunt';
	this.gameByTable[305] = 'TreasureHunt';
	this.gameByTable[306] = 'TreasureHunt';
	this.gameByTable[307] = 'TreasureHunt';



	TableEvent.on('JoinTable-TreasureHunt', (penguin, tableId, seatId) => {
		//logger.log(penguin.name() + ' is joining a Find Four match', 'green');

		if (tablesById[tableId].length == 0) {
			gameByTableId[tableId] = new TreasureHunt();
			tablePlayers[tableId] = {};
		}

		tablePlayers[tableId][seatId] = penguin;
		tablesById[tableId][seatId] = penguin.name();

		logger.log("info", "[MiniGame] TreasureHunt: {0} ({1}) is joining table {3}".format(penguin.name(), penguin.id, tableId));

		penguin.tableId = tableId;
		penguin.playerSeat = seatId;

		penguin.send('jt', penguin.room.internal_id, tableId, Number(seatId + 1));
		penguin.room.send(penguin, 'ut', penguin.room.internal_id, tableId, Number(seatId + 1));
	});

	TableEvent.on('GetGame-TreasureHunt', (penguin) => {
		let firstPlayer = tablesById[penguin.tableId][0];
		let secondPlayer = tablesById[penguin.tableId][1];
		let board = gameByTableId[penguin.tableId].boardToString();

		if (tablesById[penguin.tableId].length > 2) {
			board = [board, 1].join('%');
		}

		penguin.send('gz', penguin.room.internal_id, firstPlayer, secondPlayer, board);
	});

	TableEvent.on('Join-TreasureHunt', (penguin) => {
		let seatId = penguin.playerSeat;

		if (seatId == null || isNaN(seatId)) {
			return;
		}

		penguin.send('jz', penguin.room.internal_id, seatId);

		if (seatId == 1) {
			gameByTableId[penguin.tableId].players = [tablePlayers[penguin.tableId][0], tablePlayers[penguin.tableId][1]];
		} else if (seatId > 1) {
			gameByTableId[penguin.tableId].spectators.push(penguin);
		}

		for (let seat in tablePlayers[penguin.tableId]) {
			let player = tablePlayers[penguin.tableId][seat];

			player.send('uz', penguin.room.internal_id, seatId, penguin.name());

			if(seatId == 1) player.send('sz', penguin.room.internal_id);
		}
	});

	TableEvent.on('Movement-TreasureHunt', (penguin, data) => {
		if (data.length != 2) {
			return;
		}
		if (tablePlayers[penguin.tableId].length < 2) {
			return;
		}
		if (penguin.playerSeat > 1) {
			return;
		}

		let match = gameByTableId[penguin.tableId] || null;
		let obj = {seat: penguin.playerSeat, column: data[0], row: data[1]};
		let move;

		if (isNaN(obj.column) || isNaN(obj.row)) {
			return;
		}

		if (match !== null) {
			move = match.movement(penguin, obj);
		}

		if (move == false) {
			return;
		}

		for (let seat in tablePlayers[penguin.tableId]) {
			let player = tablePlayers[penguin.tableId][seat];

			player.send('zm', player.room.internal_id, Object.values(obj).join('%'));
		}
	});

	TableEvent.on('LeaveGame-TreasureHunt', (penguin) => {
		//handled in table.js
	});
}

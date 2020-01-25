let logger = require('../../../../util/logger.js');
let network = require('../../../../util/network.js');
let Promise = require("bluebird");
let _ = require('underscore')._;
let range = require("range").range;

class MancalaConstants {
	constructor(MancalaObject) {
		this.PLAYER_LIMIT = 2;
		this.SPECTATOR_LIMIT = 12;
		this.FIRST_BREAK = 5;
	}
}

module.exports = class MancalaObject extends MancalaConstants {
	constructor(penguin) {
		super();

		this.board = [
			4, 4, 4, 4, 4, 4, 0,
			4, 4, 4, 4, 4, 4, 0
		];

		this.players = [penguin, null];
		this.spectators = [];

		this.seatTurn = 0;

		this.finished = false;

		//logger.log('Mancala::{0} is starting a match'.format(penguin.name()), 'cyan');
		logger.log("info", "[MiniGame] Mancala: {0} ({1}) is starting a game".format(penguin.name(), penguin.id));
	}

	addPlayer(penguin) {
		if (this.players.length > this.PLAYER_LIMIT) {
			return this.addSpectator(penguin);
		}

		//logger.log('Mancala::{0} is joining a match'.format(penguin.name()), 'cyan');
		logger.log("info", "[MiniGame] Mancala: {0} ({1}) is joining a match with {2} ({3})".format(penguin.name(), penguin.id, this.players[0].name(), this.players[0].id));

		this.getPlayerBoard(penguin.playerSeat);

		this.players[1] = penguin;
	}

	addSpectator(penguin) {
		if (this.spectators.length > this.SPECTATOR_LIMIT) {
			return;
		}

		//logger.log('Mancala::{0} is spectating a match'.format(penguin.name()), 'cyan');
		logger.log("info", "[MiniGame] Mancala: {0} ({1}) is spectating match [{2} vs {3}]".format(penguin.name(), penguin.id, this.players[0].name(), this.players[1].name()));

		this.spectators.push(penguin);
	}

	boardToString() {
		return this.board.join(',');
	}

	getPlayerMancala(seat) {
		if (seat > 0) {
			return 13;
		}

		return 6;
	}

	getPlayerBoard(seat) {
		let board = this.board.slice(0);

		board.splice(6, 1);
		board.splice(12, 1);

		if (seat == 0) {
			return board.slice(0, this.FIRST_BREAK);
		}

		return board.slice(this.FIRST_BREAK + 1);
	}

	boardAntiCheat(penguin, obj) {
		if (obj.cup < 0 && cup < this.board.length) {
			//logger.log('Mancala::Bad cup input {0}'.format(obj.cup), 'red');
			logger.log("warn", "[AntiCheat] [MiniGame] Mancala: Bad cup input {0} from {1} ({2})".format(obj.cup, penguin.name(), penguin.id));
			return;
		}
	}

	movement(penguin, obj) {
		//logger.log('Mancala::{0} made a move for cup {1}'.format(penguin.name(), obj.cup), 'cyan');
		logger.log("debug", "[MiniGame] Mancala: {0} ({1}) made a move for cup {2}".format(penguin.name(), penguin.id, obj.cup));

		this.boardAntiCheat(penguin, obj);

		this.seatTurn == 0 ? this.seatTurn = 1 : this.seatTurn = 0;
	}
}

let network = require('../../../../util/network.js');
let logger = require('../../../../util/logger.js');
let range = require("range").range;

function TreasureHunt() {
	this.players = [];
	this.spectators = [];

	this.board = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 3
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 4
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 5
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 6
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 7
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 8
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 9
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  // 10
	];

	this.GEM_VALUE = 25;
	this.RARE_GEM_VALUE = 100;
	this.COIN_VALUE = 1;

	this.seatTurn = 0;
	this.turnsRemaining = 12;
	this.boardWidth = 10;
	this.boardHeight = 10;

	this.coinAmount = 0;
	this.gemAmount = 0;
	this.gemLocations = "";
	this.gemsFound = 0;
	this.coinsFound = 0;
	this.rareGemFound = false;
	this.recordNumbers = "";

	logger.log("info", "[MiniGame] TreasureHunt: initialized".format(this.COLUMNS, this.ROWS));

	this.boardToString = function() {
		let boardString = this.board.map((row) => row.join(','));

		return boardString.join(',');
	}

	this.boardToArray = function() {
		let boardString = this.boardToString();

		return boardString.split(',').map(Number);
	}

	this.playerSeatToIndex = function(seat) {
		return Math.floor(Number(seat) + 1);
	}

	this.boardAntiCheat = function(penguin, obj) {
		if (this.lastTurn == obj.seat) {
			logger.log("warn", "[AntiCheat] [MiniGame] TreasureHunt: Seat spam attempt from " + penguin.name() + " (" + penguin.id + ")");


			return this.INVALID_PLACE;
		}

		if (obj.seat != this.seatTurn) {
			//logger.log('Seat cheat attempt', 'red');
			logger.log("warn", "[AntiCheat] [MiniGame] TreasureHunt: Seat cheat attempt " + penguin.name() + " (" + penguin.id + ")");

			return this.INVALID_PLACE;
		}

		if (this.board[obj.column][obj.row] !== 0) {
			//logger.log('Board placement cheat attempt', 'red');
			logger.log("warn", "[AntiCheat] [MiniGame] TreasureHunt: Board placement cheat attempt " + penguin.name() + " (" + penguin.id + ")");

			return this.INVALID_PLACE;
		}

		if (this.board[(obj.column + 1)] !== undefined) {
			if (this.board[(obj.column + 1)][obj.row] == 0) {
				//logger.log('Board gravity hax', 'red');
				logger.log("warn", "[AntiCheat] [MiniGame] TreasureHunt: Board gravity manipulation attempt from " + penguin.name() + " (" + penguin.id + ")");

				return this.INVALID_PLACE;
			}
		}

		return this.PLACED;
	}


	this.movement = function(penguin, obj) {
		let seat = Number(obj.seat);
		let column = Number(obj.column);
		let row = Number(obj.row);

		if (this.boardAntiCheat(penguin, obj) == this.INVALID_PLACE) {
			return false;
		}

		this.board[column][row] = this.playerSeatToIndex(seat);

		this.direction = 0;

		let winStatus = this.checkWin();

		switch (winStatus) {
			case this.GAME_TIE:
				return this.gameOver(penguin);
			case this.GAME_WIN:
				return this.gameWin(penguin);
		}

		this.lastTurn = this.seatTurn;
		this.seatTurn == 0 ? this.seatTurn = 1 : this.seatTurn = 0;
	}

	this.gameWin = function(penguin) {
		this.finished = true;

		let player = this.players[this.seatTurn];

		//logger.log('{0} WON!'.format(nickname), 'green');
		logger.log("debug", "[MiniGame] TreasureHunt: Winner: " + player.name() + " (" + player.id + ")");

		for (let player of this.players) {
			let coins;

			if (player.playerSeat == this.seatTurn) {
				// Winner
				coins = player.addCoins(20);
			} else {
				// Looser
				coins = player.addCoins(10);
			}

			player.send('zo', player.room.internal_id, coins, '', 0, 0, 0);
		}

		this.flushSpectators();
	}

	this.gameOver = function(penguin) {
		this.finished = true;

		for (let player of this.players) {
			let coins = player.addCoins(5);
			player.send('zo', player.room.internal_id, coins, '', 0, 0, 0);
		}
	}





}

module.exports = TreasureHunt;

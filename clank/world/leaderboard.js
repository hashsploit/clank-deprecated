let logger = require('../../util/logger.js');
let network = require('../../util/network.js');
let Promise = require("bluebird");

require('./mail.js')();

/* Leaderboard - lb# */
module.exports = function() {

	this.startDependency = function() {
	}

	this.getLeaderboardList = async function(penguin, data) {
		let record = 0;
		let gameId = penguin.room.external_id;
		let leaderboardData = await penguin.database.engine.getLeaderboardByGameId(gameId);
		//let leaderboardList = await Promise.map(leaderboardData, (p, i) => [p.ID, p.Name, (i + 1), p.Score, p.LastPlayed].join('|'));
		let leaderboardList = [];

		for (let i in leaderboardData) {
			let username = await penguin.database.engine.getUsernameById(Number(leaderboardData[i].player_id));
			let obj = [leaderboardData[i].player_id, username, (Number(i) + 1), leaderboardData[i].score, leaderboardData[i].last_played];

			leaderboardList.push(obj.join("|"));
		}



		if (leaderboardData != undefined && leaderboardData.length > 0) {
			record = leaderboardData[0].score;
		}

		penguin.send('glb', penguin.room.internal_id, gameId, record, leaderboardList.join(','), getResetDays());

		checkPlayerRanking(penguin, gameId);
	}

	this.updatePlayerLeaderboard = async function(penguin, score) {
		if (isNaN(score) || score == undefined) {
			return;
		}

		let timestamp = Math.floor(getServerTime().getTime() / 1000);
		let gameId = penguin.room.external_id;

		if (!await penguin.database.engine.playerOnLeaderboard(penguin.id)) { //insert if not on leaderboard
			let leaderboard = await penguin.database.engine.getLeaderboardByGameId(gameId);

			// need 1k if leaderboard is empty (default was 15k)
			if (Number(score) < 1000 && leaderboard.length < 1) {
				return;
			}

			await penguin.database.engine.insertLeaderboardPlayerByGameId(gameId, {player_id: penguin.id, score: score, last_played: timestamp});

			return checkPlayerRanking(penguin);
		}

		let leaderboardData = await penguin.database.engine.getLeaderboardByPlayerId(penguin.id);
		let boardScore = leaderboardData.score;

		if (Number(score) < Number(boardScore)) {
			return;
		}

		await penguin.database.engine.updateColumn('leaderboard', 'score', 'player_id', score, penguin.id);

		// Don't need a result
		penguin.database.engine.updateColumn('leaderboard', 'last_played', 'player_id', timestamp, penguin.id);


		WebhookEvent.emit('leaderboard_log', {
			"Type": 'Leaderboard Update',
			"Player": "`" + penguin.name() + "`" + " [[Modify Player #" + penguin.id + "]](" + global.config.server.website + "/cp/player/" + penguin.id + ")",
			"Server": global.config.server.name + " [[Modify Server]](" + global.config.server.website + "/cp/server/" + global.config.server.name + ")",
			"Action": 'None',
			"Score": score,
			"Game": gameId
		});

		checkPlayerRanking(penguin, gameId);
	}

	this.checkPlayerRanking = async function(penguin, gameId) {
		let leaderboardData = await penguin.database.engine.getLeaderboardByGameId(gameId);

		// leaderboard empty
		if (leaderboardData == undefined) {
			return;
		}

		// leaderboard empty
		if (leaderboardData[0] == undefined) {
			return;
		}

		let winnerId = leaderboardData[0].player_id;
		let hasPrize = leaderboardData[0].has_prize;
		let score = leaderboardData[0].score;

		if (Number(winnerId) == penguin.id && Number(hasPrize) == 0) {
			return addTopAward(penguin, score, gameId);
		}

	}

	this.addTopAward = async function(penguin, score, gameId) {

		switch(Number(gameId)) {
			case 905: // cart surfer
				penguin.addItem(4125, 0);
				sendSystemMail(penguin, penguin.id, score, 242);
				break;

		}

		penguin.database.engine.updateColumn('leaderboard', 'has_prize', 'player_id', 1, penguin.id);
	}

	this.getResetDays = function() {
		return Math.floor((6 - getServerTime().getDay()) + 1);
	}

	this.handleSetGameMode = function(penguin, data) {
		if (isNaN(data[0])) {
			return;
		}

		let gameMode = Number(data[0]);

		if (gameMode == 1 || gameMode == 2) {
			penguin.gameMode = gameMode;
		}

		penguin.send('sgm', penguin.room.internal_id, gameMode);
	}
}

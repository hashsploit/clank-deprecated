var logger = require('../../util/logger.js');
var network = require('../../util/network.js');

/* Ignore - n# */
module.exports = function() {

	this.startDependency = function() {
	}

	this.addIgnorePlayer = function(penguin, data) {
		
	}

	this.removeIgnorePlayer = function(penguin, data) {

	}

	this.getIgnores = function(penguin, data) {
		if (penguin.ignores.length == 0) {
			penguin.send('gn', -1);
			return;
		}

		let ignoreList = [];

		for (var index in penguin.ignores) {
			var playerId = index;
			var playerNickname = penguin.ignores[playerId];

			ignoreList.push(playerId + '|' + playerNickname);
		}

		penguin.send('gn', -1, ignoreList.join('%'));
		return;
	}
}

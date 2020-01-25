var logger = require('../../util/logger.js');
var network = require('../../util/network.js');

require('./navigation.js')();
require('../events/post.js');

/* Captcha - cpc#captcha */
module.exports = function() {

	this.verifyUrl = global.config.server.website + '/api/captcha/token';

	this.startDependency = function() {
	}

	this.verifyCaptchaToken = function(penguin, data) {

		if (penguin.joined) {
			// Already joined a server
			penguin.send('e', -1, global.error.GAME_CHEAT.id);
			network.removePenguin(penguin);
			return;
		}

		// Hasn't joined server
		if (!penguin.joinedServer) {
			return;
		}

		let token = data[0];
		let builtUrl = (verifyUrl + '?key=' + global.config.api.key + '&verify_token=' + token);

		PostEvent.emit('GetRequest', builtUrl, function(response) {
			let jsonResponse = JSON.parse(response);

			// Captcha is incorrect
			if (jsonResponse['success'] !== true) {
				/*
				penguin.send('e', -1, 101); // incorect password
				network.removePenguin(penguin);
				*/
				return;
			}

			penguin.send('captchasuccess', -1);

			handleJoinWorld(penguin);
		});
	}
}

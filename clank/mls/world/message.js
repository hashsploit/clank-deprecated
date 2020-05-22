var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var commandsService = require('../events/commands.js');
var Promise = require("bluebird");
var aesjs = require("aes-js");

const NodeRSA = require('node-rsa');

require('./moderation.js')();

setInterval(function() {
	/*
	global.mainDatabase.getFilterVersion(function(version) {
		if (Number(version) !== Number(this.filterVersion)) {
			getFilter(global.mainDatabase);
		}
	});
	*/

	// Update filter
	getFilter(global.mainDatabase);

}.bind(this), 600000);

/* Messaging - m# */
module.exports = function() {
	//this.filterVersion = null;
	//this.filterCategories = {};
	this.filters = [];
	this.similarChars = {
		'i': ['j', 'l', '!'],
		'u': ['y', 'v'],
		'y': ['u'],
		'l': ['i', '!'],
		'!': ['i', 'l'],
		' ': ['.', ',', '_', '-', '+', '=', '/']
	};

	this.startDependency = function() {
		commandsService.setupCommandModules();

		global.getFilter = getFilter;

		if (!global.config.server.safe_chat) {
			// Generate Keypair
			const keyPairBits = 2048;
			global.rsaKey = new NodeRSA({b: 512});
			global.rsaKey.setOptions({encryptionScheme: 'pkcs1'});
			logger.log("info", "Generating {0}-bit RSA keypair ...".format(keyPairBits));
			global.rsaKey.generateKeyPair(keyPairBits, 65537);
			logger.log("info", "Chat initialized");
		} else {
			logger.log("info", "Using safe-chat, chat has been disabled.");
		}
	}

	this.getFilter = function(database, callback) {

		if (database == undefined) {
			return;
		}

		// Broken social filter
		/*
		database.getSocialFilter(function(results) {
			if (results == undefined || results == null) {
				//logger.log('Social Filter Not Loaded', 'red');
				logger.log("warn", "Social Filter not loaded");
			}

			this.filterCategories['ban'] = results['Ban'].split(',');
			this.filterCategories['kick'] = results['Kick'].split(',');
			this.filterCategories['mute'] = results['Mute'].split(',');
			this.filterCategories['whitelist'] = results['Whitelist'].split(',');
			this.filterCategories['blacklist'] = results['Blacklist'].split(',');
			this.filterCategories['strpos'] = results['Strpos'].split(',');

			this.filterVersion = Number(results['version']);

			if(typeof(callback) == 'function') {
				return callback();
			}
		});
		*/

		database.getChatFilters(function(results) {
			if (results == undefined || results == null) {
				//logger.log('Social Filter Not Loaded', 'red');
				return;
			}

			for (let index in results) {
				let word = results[index]["word"];
				let action = Number(results[index]["action"]);
				let mode = Number(results[index]["mode"]);
				let notify = Number(results[index]["notify"]);

				let filter = {
					"word": word,
					"action": action,
					"mode": mode,
					"notify": notify
				};

				let alreadyExists = false;
				for (let index in this.filters) {
					if (this.filters[index]["word"] == word) {
						alreadyExists = true;
						break;
					}
				}

				// Check if word is already added
				if (!alreadyExists)  {
					this.filters.push(filter);
				}
			}

			if (typeof(callback) == "function") {
				return callback();
			}

		});

		//logger.log('Social Filter Loaded', 'green');
		logger.log("debug", "Chat filter updated");
	}













	/* Report - m#r */
	this.reportPlayer = function(penguin, data) {
		let playerId = Number(data[0]);
		let reportType = Number(data[1]);
		let playerName = data[2];

		// Invalid report
		if (playerId <= 0 || reportType < 0 || reportType > 7) {
			network.removePenguin(penguin);
			return;
		}

		const REPORT_SWEARING = 0;
		const REPORT_SEXUAL_LANGUAGE = 1;
		const REPORT_RACIAL_WORDS = 2;
		const REPORT_PERSONAL_INFO = 3;
		const REPORT_EMAIL_ADDRESS = 4;
		const REPORT_REAL_NAME = 5;
		const REPORT_NAME_CALLING = 6;
		const REPORT_BAD_PENGUIN_NAME = 7;

		let reportTypes = {};
		reportTypes[REPORT_SWEARING] = "Swearing";
		reportTypes[REPORT_SEXUAL_LANGUAGE] = "Sexual language"
		reportTypes[REPORT_RACIAL_WORDS] = "Racial language";
		reportTypes[REPORT_PERSONAL_INFO] = "Personal information";
		reportTypes[REPORT_EMAIL_ADDRESS] = "Email address";
		reportTypes[REPORT_REAL_NAME] = "Real name";
		reportTypes[REPORT_NAME_CALLING] = "Name calling";
		reportTypes[REPORT_BAD_PENGUIN_NAME] = "Bad penguin name";

		logger.log("info", "Player {0} ({1}) reported player {2} ({3}) for \"{4}\"".format(penguin.name(), penguin.id, playerName, playerId, reportTypes[reportType]));

		// Add report (reporter_id, player_id, reason)
		penguin.database.addPlayerReport(penguin.id, playerId, "F: " + reportTypes[reportType]);
	}

	/* Setup encrypted message channel - m#ems */
	this.setupEncryptedMessageRequest = function(penguin, data) {
		let payload = data.slice(0).join('%');

		// If this server has safe-chat enabled, the server will never sent a ems request
		if (global.config.server.safe_chat) {
			network.removePenguin(penguin);
			return;
		}

		// Chat has already been initialized for encrypted messages
		if (penguin.encryptedChat) {
			network.removePenguin(penguin);
			return;
		}

		var decryptedHex = global.rsaKey.decrypt(payload, 'utf8');
		penguin.aesKey = aesjs.utils.hex.toBytes(decryptedHex);
		penguin.encryptedChat = true;
		logger.log("debug", "Player {0} ({1}) is using chat encryption".format(penguin.name(), penguin.id));
	}


	/* Send encrypted message - m#em */
	this.sendEncryptedMessageRequest = function(penguin, data) {
		let playerId = data[0];
		let encryptedMessage = data.slice(1).join('%'); // Everything all data after the first delemeter back to a string

		// If this server has safe-chat enabled
		if (global.config.server.safe_chat) {
			logger.log("debug", "Player {0} ({1}) tried chatting in a safe-chat only server!".format(penguin.name(), penguin.id));
			network.removePenguin(penguin);
			return;
		}

		// Player is trying to spoof their messages
		if (Number(playerId) !== Number(penguin.id)) {
			network.removePenguin(penguin);
			return;
		}

		// Chat has not been initialized for encrypted messages
		if (!penguin.encryptedChat) {
			network.removePenguin(penguin);
			return;
		}

		var encryptedBytes = aesjs.utils.hex.toBytes(encryptedMessage);
		var aesCtr = new aesjs.ModeOfOperation.ctr(penguin.aesKey);
		var decryptedBytes = aesCtr.decrypt(encryptedBytes);
		let message = aesjs.utils.utf8.fromBytes(decryptedBytes);

		inspectMessage(penguin, message);
	}



	/* Send message - m#sm */
	this.sendMessageRequest = function(penguin, data) {
		let playerId = data[0];
		let message = data[1]; // Plain-text

		// If this server has safe-chat enabled
		if (global.config.server.safe_chat) {
			logger.log("debug", "Player {0} ({1}) tried chatting in a safe-chat only server!".format(penguin.name(), penguin.id));
			network.removePenguin(penguin);
			return;
		}

		// Player is trying to spoof their messages
		if (Number(playerId) !== Number(penguin.id)) {
			network.removePenguin(penguin);
			return;
		}

		inspectMessage(penguin, message);
	}



	this.inspectMessage = function(penguin, message) {

		// TODO: Add server chat parsing to remove special chars from non-moderator players

		// If the server is safechat enabled, don't bother filtering or relaying messages
		if (global.config.server.safechat) {
			return;
		}

		// If the player is already muted
		if (penguin.muted) {
			sendBlockedMessage(penguin, message);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou may not chat, you are muted.");
			return;
		}

		// If the message length is over 48 characters and is a helper or less
		if (message.length > 48 && penguin.permission <= 1) {
			return;
		}

		if (message.length > 254) {
			return;
		}

		// Is this a command?
		let commandCheck = commandsService.isValidCommand(message.toLowerCase());

		// If this player is a moderator and is a command...
		// Permissions: 1=helper, 2=moderator, 3=administrator
		if (commandCheck !== false && (penguin.permission >= 2)) {
			commandsService.CommandsEvent.emit(commandCheck, penguin, message);
			return;
		}

		const ACTION_DENY = 0;
		const ACTION_KICK = 1;
		const ACTION_BAN = 2;

		const MODE_EXACT = 0;
		const MODE_VARIANTS = 1;

		const NOTIFY_NONE = 0;
		const NOTIFY_CHAT = 1;
		const NOTIFY_ALERT = 2;
		const NOTIFY_BOTH = 3;

		let actions = {};
		actions[ACTION_DENY] = "<font color=\"#FF00FF\">DENY</font>";
		actions[ACTION_KICK] = "<font color=\"#FFFF00\">KICK</font>";
		actions[ACTION_BAN] = "<font color=\"#FF0000\">TEMP BAN</font>";

		let parts = message.toLowerCase().split(" ");
		let blocked = false;

		// No filters
		if (this.filters === undefined || this.filters == 0) {
			sendMessage(penguin, message);
			return;
		}

		// Filters are enabled
		for (let index in this.filters) {
			let word = this.filters[index]["word"];
			let action = Number(this.filters[index]["action"]);
			let mode = Number(this.filters[index]["mode"]);
			let notify = Number(this.filters[index]["notify"]);

			logger.log("debug", "TESTING WORD '{0}' AGAINST CHAT FILTER '{1}'".format(word, message.toLowerCase()));

			switch (mode) {
				case MODE_EXACT:
					if (message.toLowerCase().indexOf(word.toLowerCase()) !== -1) {
						blocked = true;

						switch(notify) {
							case NOTIFY_CHAT:
								for (let otherPenguinId in Object.keys(penguinsById)) {
									let otherPenguin = penguins[otherPenguinId];
									// If the penguin is a moderator, send them a chat log notification
									if (otherPenguin.permission >= 2) {
										otherPenguin.send('mm', otherPenguin.room.internal_id, "Filter: '" + penguin.name() + "' said '" + word + "'.", -1);
									}
								}
							break;
							case NOTIFY_ALERT:
								for (let otherPenguinId in Object.keys(penguinsById)) {
									let otherPenguin = penguins[otherPenguinId];
									// If the penguin is a moderator, send them a server alert notification
									if (otherPenguin.permission >= 2) {
										otherPenguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nWord filter triggered by\n'" + penguin.name() + "' (<u><a href='" + global.config.general.website + "/cp/player/" + penguin.id +
											"' target='_blank'>#" + penguin.id + "</a></u>)\n<font size=\"11\">Message: '" + message + "'.</font>\nAction taken: " + actions[action]);
									}
								}
							break;
							case NOTIFY_BOTH:
								for (let otherPenguinId in Object.keys(penguinsById)) {
									let otherPenguin = penguins[otherPenguinId];
									// If the penguin is a moderator, send them a chat log notification and server alert notification
									if (otherPenguin.permission >= 2) {
										otherPenguin.send('mm', otherPenguin.room.internal_id, "Filter: '" + penguin.name() + "' said '" + word + "'.", -1);
										otherPenguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nWord filter triggered by\n'" + penguin.name() + "' (<u><a href='" + global.config.general.website + "/cp/player/" + penguin.id +
											"' target='_blank'>#" + penguin.id + "</a></u>)\n<font size=\"11\">Message: '" + message + "'.</font>\nAction taken: " + actions[action]);
									}
								}
							break;
						}

						switch(action) {
							case ACTION_DENY:
								sendBlockedMessage(penguin, message);
							break;
							case ACTION_KICK:
								kickMessage(penguin, message);
							break;
							case ACTION_BAN:
								banMessage(penguin, message);
							break;
						}
					}
				break;

				case MODE_VARIANTS:

				break;
			}

			// If the message shouldn't be blocked, send it
			if (!blocked) {
				sendMessage(penguin, message);
			}
		}

	}














	/*
	this.inspectMessage = async function(penguin, message) {
		let msg = {
			orig: message,
			lower: message.toLowerCase(),
			r: message.toLowerCase().replace(/[^a-zA-Z ]/g, ''),
			w: message.toLowerCase().split(' ')
		};

		//console.log(msg);
		logger.log("info", "[Chat] {0}: {1}".format(penguin.name(), message));

		if (this.filterCategories['ban'].indexOf(msg.lower) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['kick'].indexOf(msg.lower) >= 0) return kickMessage(penguin, message);
		if (this.filterCategories['mute'].indexOf(msg.lower) >= 0) return sendBlockedMessage(penguin, message);
		if (this.filterCategories['blacklist'].indexOf(msg.lower) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['strpos'].indexOf(msg.lower) >= 0) return sendBlockedMessage(penguin, message);

		if (this.filterCategories['ban'].indexOf(msg.r) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['kick'].indexOf(msg.r) >= 0) return kickMessage(penguin, message);
		if (this.filterCategories['mute'].indexOf(msg.r) >= 0) return sendBlockedMessage(penguin, message);
		if (this.filterCategories['blacklist'].indexOf(msg.r) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['strpos'].indexOf(msg.r) >= 0) return sendBlockedMessage(penguin, message);

		let removeSpaces = msg.r.replace(/\s/g, '');

		if (this.filterCategories['ban'].indexOf(removeSpaces) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['kick'].indexOf(removeSpaces) >= 0) return kickMessage(penguin, message);
		if (this.filterCategories['mute'].indexOf(removeSpaces) >= 0) return sendBlockedMessage(penguin, message);
		if (this.filterCategories['blacklist'].indexOf(removeSpaces) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['strpos'].indexOf(removeSpaces) >= 0) return sendBlockedMessage(penguin, message);

		let duplicatesRemoved = msg.lower.split('').filter((c, i, s) => s.indexOf(c) == i).join('');

		if (this.filterCategories['ban'].indexOf(duplicatesRemoved) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['kick'].indexOf(duplicatesRemoved) >= 0) return kickMessage(penguin, message);
		if (this.filterCategories['mute'].indexOf(duplicatesRemoved) >= 0) return sendBlockedMessage(penguin, message);
		if (this.filterCategories['blacklist'].indexOf(duplicatesRemoved) >= 0) return banMessage(penguin, message);
		if (this.filterCategories['strpos'].indexOf(duplicatesRemoved) >= 0) return sendBlockedMessage(penguin, message);

		for (let char of Object.keys(similarChars)) {
			for (let _char of similarChars[char]) {
				let index = msg.lower.indexOf(_char);
				let _index = msg.r.indexOf(_char);
				let replacedWord;
				let replaceHalf;

				//console.log('|', char, _char);
				//logger.log("debug", "|\t{0}\t{1}".format(char, _char));

				if (index >= 0) {
					replacedWord = msg.lower.replace(new RegExp(_char, 'g'), char);
					replacedHalf = msg.lower.replace(_char, char);

					//console.log('replacedWord', replacedWord);
					//logger.log("debug", "replacedWord: {0}".format(replacedWord));

					if (this.filterCategories['ban'].indexOf(replacedWord) >= 0) return banMessage(penguin, message);
					if (this.filterCategories['kick'].indexOf(replacedWord) >= 0) return kickMessage(penguin, message);
					if (this.filterCategories['mute'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['blacklist'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['strpos'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);

					if (this.filterCategories['ban'].indexOf(replacedHalf) >= 0) return banMessage(penguin, message);
					if (this.filterCategories['kick'].indexOf(replacedHalf) >= 0) return kickMessage(penguin, message);
					if (this.filterCategories['mute'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['blacklist'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['strpos'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
				}

				if (_index >= 0) {
					replacedWord = msg.r.replace(new RegExp(_char, 'g'), char);
					replacedHalf = msg.r.replace(_char, char);

					if (this.filterCategories['ban'].indexOf(replacedWord) >= 0) return banMessage(penguin, message);
					if (this.filterCategories['kick'].indexOf(replacedWord) >= 0) return kickMessage(penguin, message);
					if (this.filterCategories['mute'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['blacklist'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['strpos'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);

					if (this.filterCategories['ban'].indexOf(replacedHalf) >= 0) return banMessage(penguin, message);
					if (this.filterCategories['kick'].indexOf(replacedHalf) >= 0) return kickMessage(penguin, message);
					if (this.filterCategories['mute'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['blacklist'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
					if (this.filterCategories['strpos'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
				}
			}
		}

		for (let word of msg.w) {
			//console.log(word);
			//logger.log("debug", "word: {0}".format(word));

			let safeWord = word.replace(/[^a-zA-Z ]/g, '');

			if(this.filterCategories['ban'].indexOf(word) >= 0) return banMessage(penguin, message);
			if(this.filterCategories['kick'].indexOf(word) >= 0) return kickMessage(penguin, message);
			if(this.filterCategories['mute'].indexOf(word) >= 0) return sendBlockedMessage(penguin, message);
			if(this.filterCategories['blacklist'].indexOf(word) >= 0) return sendBlockedMessage(penguin, message);
			if(this.filterCategories['strpos'].indexOf(word) >= 0) return sendBlockedMessage(penguin, message);

			if(this.filterCategories['ban'].indexOf(safeWord) >= 0) return banMessage(penguin, message);
			if(this.filterCategories['kick'].indexOf(safeWord) >= 0) return kickMessage(penguin, message);
			if(this.filterCategories['mute'].indexOf(safeWord) >= 0) return sendBlockedMessage(penguin, message);
			if(this.filterCategories['blacklist'].indexOf(safeWord) >= 0) return sendBlockedMessage(penguin, message);
			if(this.filterCategories['strpos'].indexOf(safeWord) >= 0) return sendBlockedMessage(penguin, message);

			for (let char of Object.keys(similarChars)) {
				for (let _char of similarChars[char]) {
					let index = word.indexOf(_char);
					let _index = safeWord.indexOf(_char);
					let replacedWord;
					let replacedHalf;

					//console.log('|', char, _char);
					//logger.log("debug", "|\t{0}\t{1}".format(char, _char));

					if(index >= 0) {
						replacedWord = word.replace(new RegExp(_char, 'g'), char);
						replacedHalf = word.replace(_char, char);

						//console.log('replacedWord', replacedWord);
						//logger.log("debug", "replacedWord: {0}".format(replacedWord));

						if(this.filterCategories['ban'].indexOf(replacedWord) >= 0) return banMessage(penguin, message);
						if(this.filterCategories['kick'].indexOf(replacedWord) >= 0) return kickMessage(penguin, message);
						if(this.filterCategories['mute'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['blacklist'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['strpos'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);

						if(this.filterCategories['ban'].indexOf(replacedHalf) >= 0) return banMessage(penguin, message);
						if(this.filterCategories['kick'].indexOf(replacedHalf) >= 0) return kickMessage(penguin, message);
						if(this.filterCategories['mute'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['blacklist'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['strpos'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
					}

					if(_index >= 0) {
						replacedWord = safeWord.replace(new RegExp(_char, 'g'), char);
						replacedHalf = safeWord.replace(_char, char);

						if(this.filterCategories['ban'].indexOf(replacedWord) >= 0) return banMessage(penguin, message);
						if(this.filterCategories['kick'].indexOf(replacedWord) >= 0) return kickMessage(penguin, message);
						if(this.filterCategories['mute'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['blacklist'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['strpos'].indexOf(replacedWord) >= 0) return sendBlockedMessage(penguin, message);

						if(this.filterCategories['ban'].indexOf(replacedHalf) >= 0) return banMessage(penguin, message);
						if(this.filterCategories['kick'].indexOf(replacedHalf) >= 0) return kickMessage(penguin, message);
						if(this.filterCategories['mute'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['blacklist'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
						if(this.filterCategories['strpos'].indexOf(replacedHalf) >= 0) return sendBlockedMessage(penguin, message);
					}
				}
			}
		}

		for(let phrase of this.filterCategories['ban']) {
			if(phrase == msg.lower) return banMessage(penguin, message);
			if(phrase == msg.r) return banMessage(penguin, message);
			if(phrase == removeSpaces) return banMessage(penguin, message);
			if(phrase == duplicatesRemoved) return banMessage(penguin, message);
		}

		for(let phrase of this.filterCategories['kick']) {
			if(phrase == msg.lower) return kickMessage(penguin, message);
			if(phrase == msg.r) return kickMessage(penguin, message);
			if(phrase == removeSpaces) return kickMessage(penguin, message);
			if(phrase == duplicatesRemoved) return kickMessage(penguin, message);
		}

		for(let phrase of this.filterCategories['mute']) {
			if(phrase == msg.lower) return sendBlockedMessage(penguin, message);
			if(phrase == msg.r) return sendBlockedMessage(penguin, message);
			if(phrase == removeSpaces) return sendBlockedMessage(penguin, message);
			if(phrase == duplicatesRemoved) return sendBlockedMessage(penguin, message);
		}

		for(let phrase of this.filterCategories['blacklist']) {
			if(phrase == msg.lower) return sendBlockedMessage(penguin, message);
			if(phrase == msg.r) return sendBlockedMessage(penguin, message);
			if(phrase == removeSpaces) return sendBlockedMessage(penguin, message);
			if(phrase == duplicatesRemoved) return sendBlockedMessage(penguin, message);
		}

		for(let phrase of this.filterCategories['strpos']) {
			if(phrase == msg.lower) return sendBlockedMessage(penguin, message);
			if(phrase == msg.r) return sendBlockedMessage(penguin, message);
			if(phrase == removeSpaces) return sendBlockedMessage(penguin, message);
			if(phrase == duplicatesRemoved) return sendBlockedMessage(penguin, message);

			if(msg.lower.indexOf(phrase) >= 0) return sendBlockedMessage(penguin, message);
			if(msg.r.indexOf(phrase) >= 0) return sendBlockedMessage(penguin, message);
			if(removeSpaces.indexOf(phrase) >= 0) return sendBlockedMessage(penguin, message);
			if(duplicatesRemoved.indexOf(phrase) >= 0) return sendBlockedMessage(penguin, message);
		}

		return sendMessage(penguin, message);
	}
	*/


	/*
	this.checkMessage = function(penguin, message) {
		//rip
		let lowerMsg = message.toLowerCase();
		let lowerMsgR = lowerMsg.replace(/[^a-zA-Z ]/g, '');

		if(this.filterCategories['ban'].indexOf(String(lowerMsg)) >= 0) {
			return banMessage(penguin, message);
		} else if(this.filterCategories['kick'].indexOf(String(lowerMsg)) >= 0) {
			return kickMessage(penguin, message);
		} else if(this.filterCategories['mute'].indexOf(String(lowerMsg)) >= 0) {
			return sendBlockedMessage(penguin, message);
		}

		if(this.filterCategories['ban'].indexOf(String(lowerMsgR)) >= 0) {
			return banMessage(penguin, message);
		} else if(this.filterCategories['kick'].indexOf(String(lowerMsgR)) >= 0) {
			return kickMessage(penguin, message);
		} else if(this.filterCategories['mute'].indexOf(String(lowerMsgR)) >= 0) {
			return sendBlockedMessage(penguin, message);
		}

		let words = message.split(' ');
		for(var index in words) {
			var word = words[index];

			if(this.filterCategories['ban'].indexOf(String(word).toLowerCase()) >= 0) {
				return banMessage(penguin, message);
			} else if(this.filterCategories['kick'].indexOf(String(word).toLowerCase()) >= 0) {
				return kickMessage(penguin, message);
			} else if(this.filterCategories['mute'].indexOf(String(word).toLowerCase()) >= 0) {
				return sendBlockedMessage(penguin, message);
			} else	if(this.filterCategories['blacklist'].indexOf(String(word).toLowerCase()) >= 0) {
				return sendBlockedMessage(penguin, message);
			}

			var noSymbols = word.replace(/[^a-zA-Z ]/g, '');
			if(this.filterCategories['ban'].indexOf(String(noSymbols).toLowerCase()) >= 0) {
				return banMessage(penguin, message);
			} else if(this.filterCategories['kick'].indexOf(String(noSymbols).toLowerCase()) >= 0) {
				return kickMessage(penguin, message);
			} else if(this.filterCategories['mute'].indexOf(String(noSymbols).toLowerCase()) >= 0) {
				return sendBlockedMessage(penguin, message);
			} else if(this.filterCategories['blacklist'].indexOf(String(noSymbols).toLowerCase()) >= 0) {
				return sendBlockedMessage(penguin, message);
			}
		}

		for (var index in this.filterCategories['ban']) {
			var word = this.filterCategories['ban'][index];

			if (word == lowerMsg) {
				return banMessage(penguin, message);
			}

			if (word == lowerMsg.replace(/\s+/g, '')) {
				return banMessage(penguin, message);
			}
		}

		for (var index in this.filterCategories['kick']) {
			var word = this.filterCategories['kick'][index];

			if(word == lowerMsg) {
				return kickMessage(penguin, message);
			}

			if(word == lowerMsg.replace(/\s+/g, '')) {
				return kickMessage(penguin, message);
			}
		}

		for (var index in this.filterCategories['mute']) {
			var word = this.filterCategories['mute'][index];

			if (word == lowerMsg) {
				return sendBlockedMessage(penguin, message);
			}

			if (word == lowerMsg.replace(/\s+/g, '')) {
				return sendBlockedMessage(penguin, message);
			}
		}

		for (var index in this.filterCategories['blacklist']) {
			var word = this.filterCategories['blacklist'][index];

			if (word == lowerMsg) {
				return sendBlockedMessage(penguin, message);
			}

			if (word == lowerMsg.replace(/\s+/g, '')) {
				return sendBlockedMessage(penguin, message);
			}
		}

		for (var index in this.filterCategories['strpos']) {
			var word = this.filterCategories['strpos'][index];

			if (word == lowerMsg) {
				return sendBlockedMessage(penguin, message);
			}

			if (word == lowerMsg.replace(/\s+/g, '')) {
				return sendBlockedMessage(penguin, message);
			}

			if (lowerMsg.indexOf(word) >= 0) {
				return sendBlockedMessage(penguin, message);
			}
		}

		return sendMessage(penguin, message);
	}
	*/

	this.banMessage = function(penguin, message) {
		banPlayer(penguin, message);

		logMessage(penguin, message, 'BAN');
	}

	this.kickMessage = function(penguin, message) {
		kickPlayer(penguin);

		logMessage(penguin, message, 'KICK');
	}

	this.sendBlockedMessage = function(penguin, message) {
		for (var index in penguin.room.players) {
			var player = penguin.room.players[index];

			// Allow helpers+ to see blocked messages
			if (player.permission >= 1) {
				player.send('mm', player.room.internal_id, message, penguin.id);
			}
		}

		logMessage(penguin, message, 'DENY');
	}

	this.sendMessage = function(penguin, message) {
		Promise.each(penguin.room.players, (player) => {
			// If the player is not ignoring this penguin, then send data
			if (player.ignoresById[penguin.id] == undefined) {

				// If this player's chat is encrypted
				if (player.encryptedChat) {
					var messageBytes = aesjs.utils.utf8.toBytes(message);
					var aesCtr = new aesjs.ModeOfOperation.ctr(player.aesKey);
					var encryptedBytes = aesCtr.encrypt(messageBytes);
					var encryptedMessage = aesjs.utils.hex.fromBytes(encryptedBytes);

					player.send('em', player.room.internal_id, penguin.id, encryptedMessage);
				} else {
					// If this player's chat is plain-text
					player.send('sm', player.room.internal_id, penguin.id, message);
				}
			}
		});

		logger.log("info", "[CHAT] <{0}({1})> {2}".format(penguin.name(), penguin.id, message));
		logMessage(penguin, message, 'SENT');
	}

	this.logMessage = function(penguin, message, action) {
		penguin.database.storeMessage(penguin.id, message, action);
	}


	this.sendMascotMessage = function(penguin, data) {
		let messageId = data[0];

		// Only allow moderators+ to be mascots
		if (penguin.permission <= 1) {
			kickPlayer(penguin);
		}

		// If the player is muted
		if (penguin.muted) {
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou may not chat, you are muted.");
			return;
		}

		penguin.room.send(penguin, 'sma', penguin.room.internal_id, penguin.id, messageId);
	}


	return this;
}

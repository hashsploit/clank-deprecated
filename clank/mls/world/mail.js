var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var Promise = require("bluebird");

/* Mail - l# */
module.exports = function() {
	this.startDependency = function() {
	}

	this.startMail = function(penguin, data) {
		penguin.database.getUnreadPostcardCount(penguin.id, function(unreadPostcards) {
			penguin.database.getPostcardCount(penguin.id, function(readPostcards) {
				penguin.send('mst', -1, Number(unreadPostcards), Number(readPostcards));
			});
		});
	}

	this.getMail = function(penguin, data) {
		penguin.database.getPostcardsById(penguin.id, function(result) {
			let postcardArray = [];

			Promise.each(result, (postcard) => {
				let postcardSenderId = postcard['sender_id'];
				let postcardType = postcard['type'];
				let postcardDetails = postcard['details'];
				let postcardDate = postcard['date'];
				let postcardId = postcard['id'];
				let postcardSenderName = postcard['username'];

				let postcardData = [postcardSenderName, postcardSenderId, postcardType, postcardDetails, postcardDate, postcardId];

				postcardArray.push(postcardData.join('|'));
			}).then(() => {
				penguin.send('mg', -1, postcardArray.reverse().join('%'));
			});
		});
	}

	this.mailChecked = function(penguin, data) {
		penguin.database.mailChecked(penguin.id);

		penguin.send('mc', penguin.room.internal_id);
	}

	this.sendMail = function(penguin, data) {
		var recipientId = data[0];
		var postcardType = data[1];

		if (isNaN(recipientId) || isNaN(postcardType)) {
			return;
		}

		penguin.database.playerIdExists(recipientId, function(result) {
			if (!result) {
				return;
			}

			if (penguin.coins < 20) {
				penguin.send('ms', penguin.room.internal_id, penguin.coins, 2);
				return;
			}

			penguin.database.getPostcardCount(recipientId, function(readPostcards) {
				if (Number(readPostcards) > 99) {
					penguin.send('ms', penguin.room.internal_id, penguin.coins, 0);
					return;
				}

				if (global.postcards.indexOf(Number(postcardType)) == -1) {
					penguin.send('e', penguin.room.internal_id, global.error.ITEM_NOT_EXIST.id);
					return;
				}

				penguin.subtractCoins(10);
				penguin.send('ms', penguin.room.internal_id, penguin.coins, 1);

				var sentDate = new Date().getTime();


				penguin.database.sendMail(recipientId, penguin.id, '', sentDate, postcardType, function(postcardId) {

					if (penguinsById[recipientId] !== undefined) {
						penguinsById[recipientId].send('mr', penguin.room.internal_id, penguin.name(), penguin.id, postcardType, '', sentDate, postcardId);
					}

				});
			});
		});
	}

	this.sendSystemMail = function(penguin, playerId, details, postcardType, sentDate) {
		//var nickname = "Club Penguin Continued";
		var nickname = global.config.server.club_penguin;
		var id = 0;

		// 1 = I've redecorated my igloo come check it out
		// 2 = Puffle performance in my igloo
		// 3 = The penguins that time forgot (goto stage)
		// 4 = Meet me at the coffee shop (goto coffee shop)
		// 5 = Meet me at the pizza parlor (goto pizza parlor)
		// 6 = Happy Birthday
		// 7 = Halloween costume try-outs at my igloo
		// 8 = Let's check out the play at the stage (goto stage)
		// 9 = Hide and Seek
		// 10 = Mancala
		// 11 = Christmas present hat
		// 12 = Welcome to Club Penguin
		// 13 = Thanks for the gift!
		// 14 = Beach
		// 15 = CFC Donations make a change
		// 16 = Ice rink (goto ice rink)
		// 17 = Cool Igloo
		// 19 = Great game
		// 20 = Snow Forts
		// 9000 = System Message

		if (sentDate == undefined) {
			var sentDate = new Date().getTime();
		}

		if (details == undefined) {
			details = "";
		}

		penguin.database.sendMail(playerId, id, details, sentDate, postcardType, function(postcardId) {
			if (penguinsById[playerId] !== undefined) {
				penguinsById[playerId].send('mr', penguinsById[playerId].room.internal_id, nickname, id, postcardType, details, sentDate, postcardId);
			}
		});
	}

	this.deleteMailItem = function(penguin, data) {
		var postcardId = data[0];

		if (isNaN(postcardId)) {
			return;
		}

		penguin.database.playerOwnsPostcard(postcardId, penguin.id, function(result) {
			if (!result) {
				return;
			}
			penguin.database.deleteMail(postcardId);
		});
	}

	this.deleteMailItemFromPlayer = function(penguin, data) {
		var playerId = data[0];

		if (isNaN(playerId)) {
			return;
		}

		penguin.database.deleteMailFromPlayer(penguin.id, playerId);

		penguin.database.getPostcardCount(penguin.id, function(readPostcards) {
			penguin.send('mdp', penguin.room.internal_id, readPostcards);
		});
	}
}

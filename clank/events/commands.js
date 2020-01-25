var logger = require("../../util/logger.js");
var network = require("../../util/network.js");
var room = require("../room.js");
var EventEmitter = require("events");

require("../world/navigation.js")();
require("../world/moderation.js")();
require("../world/mail.js")();

/* Commands Service */

var commands = {
	"help": "getHelp",
	"ping": "getPing",
	"server": "getServer",
	"mail": "sendMail",
	"list": "getPopulation",
	"room": "joinRoom",
	"find": "findPlayer",
	"kick": "handleKickPenguin",
	"coins": "handleCoins",
	"item": "handleItem",
	"info": "getPlayerInfo",
	"mute": "handleMute",
	"reboot": "handleReboot",
	"stop": "handleStop",
	"switch": "handleServerJump",
	"bc": "broadcastMessage",
	"tp": "teleportToPlayer",
	"tphere": "teleportPlayerHere",
	"hide": "handleHidePlayer",
	"freeze": "handleFreezeRoom"
};

CommandsEvent = new EventEmitter();
CommandsModule = new CommandModules();

function setupCommandModules() {
	let prefix = global.config.server.command_prefix;

	for (var key in commands) {
		var cmdFunction = commands[key];

		CommandsEvent.on(cmdFunction, (penguin, message) => {

			logger.log("info", "Player {0} ({1}) issued server command: {2}".format(penguin.name(), penguin.id, message));

			// Remove prefix from message
			message = message.slice(prefix.length);

			var commandArray = message.split(' ');
			var commandHandler = commandArray[0];
			var arguments = commandArray.splice(1);

			CommandsModule[commands[commandHandler]](penguin, arguments);
		});
	}
}

function sendFancyMessage(penguin, jsonMessage, chatMessage=null) {
	if (penguin == null || jsonMessage == null) {
		return;
	}

	let _data = [];
	let count = 0;

	for (var key in jsonMessage) {
		var value = jsonMessage[key];
		var string = "<b>" + key + ":</b> " + value + (count % 2 == 0 ? "    " : "\n");

		_data.push(string);
		count++;
	}

	var formattedMessage = "<font size='11'>\n" + _data.join(' ') + "</font>";

	if (chatMessage != null) {
		penguin.send('mm', penguin.room.internal_id, chatMessage, -1);
	}
	penguin.send('e', -1, global.error.SERVER_MESSAGE.id, formattedMessage);
}

function isValidCommand(message) {
	let prefix = global.config.server.command_prefix;
	var index = prefix.indexOf(message[0]);

	if (index == -1) {
		return false;
	}

	message = message.split(prefix)[1];

	var commandArray = message.split(' ');
	var commandHandler = commandArray[0];
	var arguments = commandArray.splice(1);

	if (commands[commandHandler] == undefined) {
		return false;
	}

	return commands[commandHandler];
}

function CommandModules() {

	// help: show commands
	this.getHelp = function(penguin) {
		let prefix = global.config.server.command_prefix;

		penguin.send('mm', penguin.room.internal_id, "Moderator Commands:", -1);
		penguin.send('mm', penguin.room.internal_id, "ping, server, list, find, info, tp, kick, hide, freeze, switch", -1);

		if (penguin.permission >= 3) {
			penguin.send('mm', penguin.room.internal_id, "Administrator Commands:", -1);
			penguin.send('mm', penguin.room.internal_id, "room, tphere, mail, coins, item, reboot, bc, stop", -1);
		}

		return;
	}

	// ping: count # of users in the server total
	this.getPing = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		const USAGE_MSG = "Usage: {0}ping [message]".format(prefix);

		if (arguments) {
			if (arguments.length >= 1) {
				let msg = arguments.join(' ');
				penguin.send('mm', penguin.room.internal_id, "Pong: {0}".format(msg), -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPong: {0}".format(msg));
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, 'Pong!', -1);
		return;
	}

	// server: get server stats
	this.getServer = function(penguin) {
		let totalPlayers = Object.keys(penguinsById).length;
		let totalMembers = 0;
		let totalHelpers = 0;
		let totalModerators = 0;
		let totalAdministrators = 0;

		penguin.send('mm', penguin.room.internal_id, "Server: {0} ({1} v{2}) [{3}/{4}]".format(global.config.server.name, global.name, global.version, totalPlayers, global.config.server.capacity), -1);

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];

			if (otherPenguin.permission == 3) {
				totalAdministrators++;
			} else if (otherPenguin.permission == 2) {
				totalModerators++;
			} else if (otherPenguin.permission == 1) {
				totalHelpers++;
			} else if (otherPenguin.member) {
				totalMembers++;
			}
		}

		var msg = "You're connected to <u><a href='" + global.config.server.website + "/cp/server/" + global.config.server.name + "' target='_blank'>" + global.config.server.name + "</a></u>\n";

		msg += "<font size='11'><b>Server ID:</b> {0} <b>Emulator:</b> {1} v{2} <b>Platform:</b> {3}</font>\n"
			.format(global.config.server.id, global.name, global.version, process.platform);
		msg += "<font size='11'><b>Players:</b> " + totalPlayers + "/" + global.config.server.capacity +
			" (Helpers: " + totalHelpers + ") (Mods: " + totalModerators + ") (Admins: " + totalAdministrators + ")" + "</font>\n";
		msg += "<font size='11'><b>Access: </b>" +
			(!global.config.server.moderator ? ("<font color='#00FF00'>Public</font>") :
			("<font color='#FFFF00'>Staff</font>")) +
			" <b>Rooms:</b> " + Object.keys(global.rooms).length +
			" <b>Igloos:</b> " + Object.keys(global.igloos).length +
			" <b>Items:</b> " + Object.keys(global.items).length + "</font>\n";
		msg += "<font size='11'><b>Furniture:</b> " + Object.keys(global.furniture).length +
			" <b>CJ Cards:</b> " + Object.keys(global.cards).length +
			" <b>EPF Items:</b> " + Object.keys(global.epfItems).length +
			" <b>Pins:</b> " + Object.keys(global.pins).length + "</font>";

		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, msg);

		return;
	}

	// mail: Send mail
	this.sendMail = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;

		// Administrators only
		if (penguin.permission < 3) {
			return;
		}

		// Command arguments required
		if (arguments.length < 2) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}mail <player> <cardType> [data]".format(prefix), -1);
			return;
		}

		let playerName = arguments[0];
		let cardType = arguments[1];
		let cardData = arguments.splice(2).join(' ');

		for (let otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().toUpperCase() == playerName.toUpperCase()) {

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

				// Send mail to player
				sendSystemMail(otherPenguin, otherPenguin.id, cardData, cardType, null);
				penguin.send('mm', penguin.room.internal_id, "Sent postcard to '" + otherPenguin.name() + "'.", -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nSent postcard to  '" + otherPenguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>).");
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '{0}' is offline or on another server.".format(playerName));
	}

	// list: count # of players in the server total
	this.getPopulation = function(penguin) {
		let playerCount = Object.keys(penguinsById).length;
		penguin.send('mm', penguin.room.internal_id, "There {0} {1} player{2} on this server.".format((playerCount > 1) ? "are" : "is", playerCount, (playerCount > 1) ? "s" : ""), -1);
		let str = "<font size='11'><b>Server Population {0}/{1}</b>\n".format(playerCount, global.config.server.capacity);

		for (let index in global.rooms) {
			let room = global.rooms[index];
			if (!room) {
				continue;
			}
			// Inactive rooms, Game rooms, and Igloo rooms should be ignored
			if (!room.is_active || room.is_game || room.is_igloo) {
				continue;
			}
			if (room.players.length == 0) {
				continue;
			}
			str += "{0} (#{1}): {2} ".format(room.name, room.external_id, room.players.length);
		}

		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\n" + str);
		return;
	}

	// room: View the current room ID, or Join a room with a specific ID
	this.joinRoom = function(penguin, arguments) {
		if (penguin.permission < 3) {
			return;
		}

		var force = false;

		// If the last argument is "force" the player wants to force join the room
		if (arguments.length >= 2) {
			if (arguments[arguments.length-1] == "force") {
				arguments.pop();
				force = true;
			}
		}

		let roomId = arguments.join(' ');

		if (!roomId) {
			penguin.send('mm', penguin.room.internal_id, "Room #" + penguin.room.external_id + ": " + penguin.room.name + " [" + penguin.room.players.length + " player(s)]", -1);
			let msg = "\n<b>Room ID:</b> #" + penguin.room.external_id + "\n";

			if (penguin.room.is_igloo) {
				let owner = penguinsById[Number(penguin.room.external_id) - 1000];
				msg += "<b>Name:</b> " + penguin.room.name + "\n";
				msg += "<font size='11'><b>Is Igloo:</b> <font color='#00FF00'>True</font> <b>Igloo Open:</b> " + (global.openIgloos[owner.id] == undefined ?
					"<font color='#FF0000'>False</font>" : "<font color='#00FF00'>True</font>") + "\n<b>Igloo Owner:</b> '" + owner.name() + "' (" +
					"<u><a href='" + global.config.server.website + "/cp/player/" + (Number(penguin.room.external_id) - 1000) +
					"' target='_blank'>#" + penguin.room.external_id + "</a></u>)</font>\n";
			} else {
				msg += "<b>Name:</b> " + penguin.room.name + " (<font color='#FFFFFF'><i>" + penguin.room.display_name + "</i></font>)" + "\n";
				msg += "<font size='11'><b>Internal ID:</b> " + penguin.room.internal_id + " <b>Is Igloo:</b> <font color='#FF0000'>False</font> " +
					"<b>Solo:</b> " + (penguin.room.is_solo ? ("<font color='#00FF00'>" + penguin.room.is_solo.toString().capitalize() + "</font>") :
					("<font color='#FF0000'>" + penguin.room.is_solo.toString().capitalize() + "</font>")) + "</font>\n";
			}

			msg += "<font size='11'><b>Room Capacity: </b>" + penguin.room.players.length + " / " + penguin.room.capacity + "</font>";
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, msg);

			return;
		}

		for (let index in global.rooms) {
			let room = global.rooms[index];
			if (!room) {
				continue;
			}
			if (!room.display_name) {
				continue;
			}
			// Inactive rooms should be ignored
			if (!room.is_active) {
				continue;
			}

			if (room.external_id == roomId ||
				room.name.trim().toUpperCase() == String(roomId).trim().toUpperCase() ||
				room.name.trim().toUpperCase().split(' ').join('') == String(roomId).trim().toUpperCase().split(' ').join('')) {

				if (room.is_game && !force) {
					penguin.send('mm', penguin.room.internal_id, "Force-join required to join game room #{0}: {1}.".format(room.external_id, room.name), -1);
					penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nThe room #{0}: {1} requires a <i>force-join</i> as it is a game room.".format(room.external_id, room.name));
					return;
				}

				// Join the room
				joinRoom(penguin, room.external_id, 0, 0, true);
				penguin.send('mm', penguin.room.internal_id, "Joined room #{0} {1}.".format(room.external_id, room.name), -1);
				return;
			}
		}


		if (isNaN(roomId)) {
			penguin.send('mm', penguin.room.internal_id, "No room with name of '{0}'.".format(roomId), -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nNo room with name of '{0}'.".format(roomId));
		} else {
			penguin.send('mm', penguin.room.internal_id, "No room with ID #{0}.".format(roomId), -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nNo room with ID #{0}.".format(roomId));
		}
	}



	// find: find where a player is in the server by room ID
	this.findPlayer = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var playerName = arguments[0];

		if (playerName == undefined) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}find <player>".format(prefix), -1);
			return;
		}

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().toUpperCase() == playerName.toUpperCase()) {
				penguin.send('mm', penguin.room.internal_id, "Player '{0}' in room {1} (#{2}).".format(otherPenguin.name(), otherPenguin.room.name, otherPenguin.room.external_id), -1);

				if (otherPenguin.room.is_game) {
					penguin.send('mm', penguin.room.internal_id, "Player '{0}' is playing a game.".format(otherPenguin.name()), -1);
				} else {
					penguin.send('mm', penguin.room.internal_id, "Player '{0}' is at (X={1}, Y={2}).".format(otherPenguin.name(), otherPenguin.x, otherPenguin.y), -1);
				}

				//penguin.send('bf', penguin.room.internal_id, otherPenguin.room.external_id);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '" + otherPenguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>) is in room " + otherPenguin.room.name + " (#" + otherPenguin.room.external_id + ").");
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '{0}' is offline or on another server.".format(playerName));
	}

	// info: get information on a player
	this.getPlayerInfo = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var playerName = arguments[0];

		if (playerName == undefined) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}info <player>".format(prefix), -1);
			return;
		}

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().toUpperCase() == playerName.toUpperCase()) {

				var permissionLevels = ["Player", "Helper", "Moderator", "Administrator"];

				var json = {
					"USN/ID": otherPenguin.name() + " (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>)",
					"Room": otherPenguin.room.name + " (<u><a href='" + global.config.server.website + "/cp/room/" + otherPenguin.room.external_id + "' target='_blank'>#" + otherPenguin.room.external_id + "</a></u>)",
					"Member": otherPenguin.member ? "<font color='#00FF00'>true</font>" : "<font color='#FF0000'>false</font>",
					"Muted": otherPenguin.muted ? "<font color='#00FF00'>true</font>" : "<font color='#FF0000'>false</font>",
					"USN Approved": otherPenguin.approved ? "<font color='#00FF00'>true</font>" : "<font color='#FF0000'>false</font>",
					"Permission": otherPenguin.permission + " (" + permissionLevels[otherPenguin.permission] + ")",
					"EPF Agent": otherPenguin.epf ? "<font color='#00FF00'>true</font>" : "<font color='#FF0000'>false</font>",
					"Items": otherPenguin.inventory.length,
					"Chat": otherPenguin.encryptedChat ? "<font color='#00FF00'>encrypted</font>" : "<font color='#FF0000'>unencrypted</font>",
					"Coins": otherPenguin.coins,
					"Buddies": otherPenguin.buddies.length,
					"Stamps": otherPenguin.stamps.length,
					"Connection": otherPenguin.isWS ? "<font color='#9999FF'>WebSocket</font>" : "Socket"
				};

				var chatMessage = "Player " + otherPenguin.name() + " has id #" + otherPenguin.id + ".";

				sendFancyMessage(penguin, json, chatMessage);

				penguin.send('mm', penguin.room.internal_id, "Player '" + otherPenguin.name() + "' in room " + otherPenguin.room.name + " (#" + otherPenguin.room.external_id + ").", -1);
				if (otherPenguin.room.is_game) {
					penguin.send('mm', penguin.room.internal_id, "Player '" + otherPenguin.name() + "' is playing a game.", -1);
				} else {
					penguin.send('mm', penguin.room.internal_id, "Player '" + otherPenguin.name() + "' is at (X=" + otherPenguin.x + ", Y=" + otherPenguin.y + ").", -1);
				}

				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, "Player '" + playerName + "' is offline or on another server.", -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '" + playerName + "' is offline or on another server.");
	}

	// kick: kick a player
	this.handleKickPenguin = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var playerName = arguments[0];

		if (playerName == undefined) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}kick <player>".format(prefix), -1);
			return;
		}

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {
				// TODO: Add reason?
				kickPlayer(otherPenguin);
				penguin.send('mm', penguin.room.internal_id, "Kicked  '" + otherPenguin.name() + "'" + "' (#" + otherPenguin.id + ").", -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nKicked '" + otherPenguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>)");
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, "Player '" + playerName + "' is offline or on another server.", -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '" + playerName + "' is offline or on another server.");
	}

	// mute: mute a player
	this.handleMute = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var playerName = arguments[0];

		if (playerName == undefined) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}mute <player>".format(prefix), -1);
			return;
		}

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {
				otherPenguin.muted = !otherPenguin.muted;
				logger.log("info", "Moderator {0} ({1}) {2} player {3}".format(penguin.name(), penguin.id, (penguinsById[playerId].muted ? "muted" : "un-muted"), playerId));
				penguin.send('mm', penguin.room.internal_id, "Player '{0}' (#{1}) is now {2}.".format(penguinsById[playerId].name(), playerId, (penguinsById[playerId].muted ? "muted" : "un-muted")), -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "Player '" + penguinsById[playerId].name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + playerId + "' target='_blank'>#{0}</a></u>) is now {1}.".format(playerId, (penguinsById[playerId].muted ? "muted" : "un-muted")));
				return;
			}

		}

		penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '{0}' is offline or on another server.".format(playerName));
	}





	// reboot: reboot the server
	this.handleReboot = function(penguin, arguments) {
		if (penguin.permission < 3) {
			return;
		}

		for (let otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin !== undefined) {
				otherPenguin.send('e', -1, global.error.SERVER_REBOOT.id);
			}
		}

		setTimeout(function() {
			global.stopServer();
		}, 3000);
	}



	// stop: shutdown the server
	this.handleStop = function(penguin, arguments) {
		if (penguin.permission < 3) {
			return;
		}

		for (let otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin !== undefined) {
				otherPenguin.send('e', -1, global.error.SOCKET_LOST_CONNECTION.id);
				network.removePenguin(otherPenguin);
			}
		}

		setTimeout(function() {
			global.stopServer();
		}, 2000);
	}




	// bc: Broadcast a message
	this.broadcastMessage = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;

		if (penguin.permission < 3) {
			return;
		}

		let message = arguments.join(' ');

		if (!message) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}bc <message>".format(prefix), -1);
			return;
		}

		for (let otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];

			if (otherPenguin !== undefined) {
				otherPenguin.send('mm', otherPenguin.room.internal_id, message, -1);
				// Error 991 = Server message
				otherPenguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\n" + message);
			}

		}
	}




	// tp: teleport to a player
	this.teleportToPlayer = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		let playerName = arguments[0];

		if (!playerName) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}tp <player>".format(prefix), -1);
			return;
		}

		if (penguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {
			penguin.send('mm', penguin.room.internal_id, "You can't teleport to yourself.", -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou can't teleport to yourself.");
			return;
		}

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {

				if (penguin.room.external_id == otherPenguin.room.external_id) {
					penguin.send('mm', penguin.room.internal_id, "Player '{0}' is already in this room at (X={1}, Y={2}).".format(playerName, otherPenguin.x, otherPenguin.y), -1);
					penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '" + otherPenguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>) is in this room at\n<b>(X=" + otherPenguin.x + ", Y=" + otherPenguin.y +")</b>");
					return;
				}

				joinRoom(penguin, otherPenguin.room.external_id);
				return;
			}
		}
		penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '{0}' is offline or on another server.".format(playerName));
	}





	// tphere: teleport a player to the current room
	this.teleportPlayerHere = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		if (penguin.permission < 3) {
			return;
		}
		var playerName = arguments[0];

		if (!playerName) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}tphere <player>".format(prefix), -1);
			return;
		}

		if (penguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {
			penguin.send('mm', penguin.room.internal_id, "You can't teleport to yourself.", -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou can't teleport to yourself.");
			return;
		}

		for (var otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin.name().trim().toUpperCase() == playerName.trim().toUpperCase() && penguin.room.external_id != otherPenguin.room.external_id) {
				joinRoom(otherPenguin, penguin.room.external_id);
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '{0}' is offline or on another server.".format(playerName));
	}




	// coins: Edit coins of players
	this.handleCoins = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var mode = arguments[0];
		var amount = arguments[1];
		var playerName = arguments[2];
		const MAX = 10000;
		const USAGE_MSG = "Usage: {0}coins <add/remove> <amount> [player]".format(prefix);

		if (mode == undefined || amount == undefined) {
			penguin.send('mm', penguin.room.internal_id, USAGE_MSG, -1);
			return;
		}

		if (isNaN(amount)) {
			penguin.send('mm', penguin.room.internal_id, USAGE_MSG, -1);
			return;
		}

		if (Number(amount) <= 0) {
			penguin.send('mm', penguin.room.internal_id, "Amount must be greater than 0.", -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nCoin amount must be greater than 0.");
			return;
		}

		if (Number(amount) > MAX) {
			penguin.send('mm', penguin.room.internal_id, "You can only modify " + MAX + " coins at a time.", -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou can only modify " + MAX + " coins at a time.");
			return;
		}

		if (playerName !== undefined) {
			for (var otherPenguinId in Object.keys(penguinsById)) {
				let otherPenguin = penguins[otherPenguinId];
				if (otherPenguin !== undefined) {
					if (otherPenguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {
						// Set other player coins
						if (mode == "add") {
							otherPenguin.addCoins(Number(amount));
							otherPenguin.send('dc', otherPenguin.room.internal_id, otherPenguin.coins);
							penguin.send('mm', penguin.room.internal_id, "Added {0} coin(s) to '{1}' (#{2}).".format(amount, otherPenguin.name(), otherPenguin.id), -1);
							penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nAdded " + amount + " coin(s) to '" + otherPenguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>).\n\nTotal coins: " + otherPenguin.coins);
							return;
						} else if (mode == "remove") {
							otherPenguin.subtractCoins(Number(amount));
							otherPenguin.send('dc', otherPenguin.room.internal_id, otherPenguin.coins);
							penguin.send('mm', penguin.room.internal_id, "Removed {0} coin(s) from '{1}' (#{2}).".format(amount, otherPenguin.name(), otherPenguin.id), -1);
							penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nRemoved " + amount + " coin(s) from '" + otherPenguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + otherPenguin.id + "' target='_blank'>#" + otherPenguin.id + "</a></u>).\n\nTotal coins: " + otherPenguin.coins);
							return;
						}
					}
				}
			}
			penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nPlayer '{0}' is offline or on another server.".format(playerName));
			return;
		} else {
			// Set self coins
			if (mode == "add") {
				penguin.addCoins(Number(amount));
				penguin.send('dc', penguin.room.internal_id, penguin.coins);
				penguin.send('mm', penguin.room.internal_id, "Added {0} coin(s) to '{1}' (#{2}).".format(amount, penguin.name(), penguin.id), -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nAdded " + amount + " coin(s) to '" + penguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player/" + penguin.id + "' target='_blank'>#" + penguin.id + "</a></u>).\n\nTotal coins: " + penguin.coins);
				return;
			} else if (mode == "remove") {
				penguin.subtractCoins(Number(amount));
				penguin.send('dc', penguin.room.internal_id, penguin.coins);
				penguin.send('mm', penguin.room.internal_id, "Removed {0} coin(s) from '{1}' (#{2}).".format(amount, penguin.name(), penguin.id), -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nRemoved " + amount + " coin(s) from '" + penguin.name() + "' (<u><a href='" + global.config.server.website + "/cp/player" + penguin.id + "' target='_blank'>#" + penguin.id + "</a></u>).\n\nTotal coins: " + penguin.coins);
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, USAGE_MSG, -1);
	}




	// furniture: add furniture
	// FIXME: validate user input and check if furniture exists in crumbs/furniture_items.json
	this.handleFurniture = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var furnitureId = arguments[0];

		if (furnitureId == undefined) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}furniture <furnitureId>".format(prefix), -1);
			return;
		}

		if (isNaN(furnitureId)) {
			penguin.send('mm', penguin.room.internal_id, "Usage: {0}furniture <furnitureId>".format(prefix), -1);
			return;
		}


		penguin.buyFurniture(furnitureId, 0);
	}





	// items: Manage items
	// Removing an item from the player will not update client-side until the client reconnects.
	this.handleItem = function(penguin, arguments) {
		let prefix = global.config.server.command_prefix;
		var mode = arguments[0];
		var itemId = arguments[1];
		var playerName = arguments[2];

		const USAGE_MSG = "Usage: {0}item <add/remove> <itemName/itemId> [player]".format(prefix);

		if (mode == undefined || itemId == undefined) {
			penguin.send('mm', penguin.room.internal_id, USAGE_MSG, -1);
			return;
		}

		if (isNaN(itemId)) {
			for (var index in global.items) {

				if (global.items[index] == undefined) {
					continue;
				}

				if (
					global.items[index][1].trim().toUpperCase() == itemId.trim().toUpperCase() || // Is "ITEM NAME" == "ITEM NAME"
					global.items[index][1].trim().toUpperCase().split(' ').join('') == itemId.trim().toUpperCase().split(' ').join('') // Is "ITEMNAME == "ITEMNAME"
				) {

					itemId = index;
				}
			}
		} else {
			if (Number(itemId) <= 0) {
				penguin.send('mm', penguin.room.internal_id, "Item ID must be greater than 0.", -1);
				penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nItem ID must be greater than 0.");
				return;
			}
		}

		if (playerName !== undefined) {
			for (var otherPenguinId in Object.keys(penguinsById)) {
				let otherPenguin = penguins[otherPenguinId];
				if (otherPenguin !== undefined) {
					if (otherPenguin.name().trim().toUpperCase() == playerName.trim().toUpperCase()) {
						// Set other players items
						if (mode == "add") {
							otherPenguin.addItem(itemId);
							penguin.send('mm', otherPenguin.room.internal_id, "Gave item {0} to '{1}' (#{2}).".format(itemId, otherPenguin.name(), otherPenguin.id), -1);
							return;
						} else if (mode == "remove") {
							otherPenguin.removeItem(itemId);
							penguin.send('mm', otherPenguin.room.internal_id, "Removed item {0} from '{1}' (#{2}).".format(itemId, otherPenguin.name(), otherPenguin.id), -1);
							return;
						}
					}
				}
			}
			penguin.send('mm', penguin.room.internal_id, "Player '{0}' is offline or on another server.".format(playerName), -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "Player '{0}' is offline or on another server.".format(playerName));
		} else {
			// Set self coins
			if (mode == "add") {
				penguin.addItem(itemId);
				penguin.send('mm', penguin.room.internal_id, "Gave item {0} to yourself.".format(itemId), -1);
				return;
			} else if (mode == "remove") {
				penguin.removeItem(itemId);
				penguin.send('mm', penguin.room.internal_id, "Removed item {0} from yourself.".format(itemId), -1);
				return;
			}
		}

		penguin.send('mm', penguin.room.internal_id, USAGE_MSG, -1);
	}


	// hide: toggle hiding the current user from all rooms server-wide
	this.handleHidePlayer = function(penguin, arguments) {
		if (penguin.hiding) {
			penguin.hiding = false;
			penguin.room.send(penguin, 'ap', penguin.room.internal_id, penguin.getPlayerString());
			penguin.send('mm', penguin.room.internal_id, 'You are now visible.', -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou are now visible.");
		} else {
			penguin.hiding = true;
			penguin.room.send(penguin, 'rp', penguin.room.internal_id, penguin.id);
			penguin.send('mm', penguin.room.internal_id, "You are now hidden.", -1);
			penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou are now hidden.");
		}
	}

	// freeze: "freeze" the current rooms actions for the current player, simply leave the room to return to normal.
	this.handleFreezeRoom = function(penguin, arguments) {
		penguin.room.remove(penguin);
		penguin.send('mm', penguin.room.internal_id, 'You were removed from the room.', -1);
		penguin.send('e', -1, global.error.SERVER_MESSAGE.id, "\nYou were removed from the room. Re-enter the room to resume.");
	}

	// switch: jump to another server
	this.handleServerJump = function(penguin, arguments) {
		// Only moderators and above can use server jumping
		if (penguin.permission <= 1) {
			let server = arguments[0];

			if (server == undefined) {
				// Send player back to server list
				penguin.send("serverjump", -1);
			}
		}
	}

}


module.exports.commands = commands;
module.exports.CommandsEvent = CommandsEvent;
module.exports.setupCommandModules = setupCommandModules;
module.exports.isValidCommand = isValidCommand;

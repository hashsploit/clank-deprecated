var logger = require("../logger.js");
var EventEmitter = require("events");

/* Commands Service */
let prefix = global.config.server.command_prefix;
var commands = {
	"help": {operator: false, function: "getHelp"},
	"ping": {operator: false, function: "getPing"},
	"server": {operator: false, function: "getServer"},
	"kick": {operator: true, function: "handleKick"},
	"info": {operator: true, function: "getPlayerInfo"},
	"mute": {operator: true, function: "handleMute"},
	"stop": {operator: true, function: "handleStop"},
};

let CommandsEvent = new EventEmitter();
let CommandsModule = new CommandModules();

function setupCommandModules() {

	for (let key in commands) {
		let operator = command[key].operator;
		let cmdFunction = commands[key].function;

		CommandsEvent.on(cmdFunction, (player, message) => {

			// Remove prefix from message
			message = message.slice(prefix.length);
			let commandArray = message.split(' ');
			let commandHandler = commandArray[0];
			let arguments = commandArray.splice(1);

			// Check permission
			if (operator && !(player.name in global.config.operators)) {
				logger.log("info", "Player {0} ({1}) attempted to execute an operator only command: {2}".format(player.name, player.id, commandHandler));
				return;
			}

			logger.log("info", "Player {0} ({1}) issued server command: {2}".format(player.name, player.id, message));

			CommandsModule[commands[commandHandler]](player, arguments);
		});
	}
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
	this.handleKick = function(penguin, arguments) {
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

}


module.exports.commands = commands;
module.exports.CommandsEvent = CommandsEvent;
module.exports.setupCommandModules = setupCommandModules;
module.exports.isValidCommand = isValidCommand;

var logger = require('./logger.js');
var packets = require('./packet.js');
var player_class = require('./player.js');
var room = require('./room.js');
var net = require('net');
var event_emitter = require('events');
var fs = require('fs');

// Number of seconds before socket times out
const SOCKET_TIMEOUT_SECONDS = 10;
const SOCKET_TIMEOUT = 1000 * 60 * SOCKET_TIMEOUT_SECONDS;

class pack_emitter extends event_emitter {}
var packet_event = new pack_emitter;

global.players = [];

function start(address, port) {
	var server = net.createServer();

	server.on('connection', onConnection);
	server.listen(port, address);

	logger.log("info", "Listening on {0}:{1}".format(address ? address : "*", port));
}

function onConnection(conn) {
	logger.log("debug", "Incoming connection > {0}:{1}".format(conn.remoteAddress, conn.remotePort), 'cyan');

	conn.setTimeout(SOCKET_TIMEOUT);
	conn.setEncoding("utf8");
	conn.setNoDelay(true);

	if ((players.length + 1) > global.config.capacity) {
		// TODO: Send server full packet to client
		conn.end();
		conn.destroy();
		logger.log("warn", "The server is full. Players: " + (players.length + 1));
		return;
	}

	let player = new player_class(conn, false);

	player.start();
	players.push(player);

	player.ip_address = conn.remoteAddress;
	player.port = conn.remotePort;

	conn.on('data', (data) => {
		return on_data(player, data);
	});
	conn.on('error', (error) => {
		return on_error(player, error);
	});
	conn.on('timeout', () => {
		return on_timeout(player);
	});
	conn.once('close', () => {
		return on_close(player);
	});
}

function on_timeout(player) {
	logger.log("warn", "Connection timeout: {0}:{1}".format(player.ip_address, player.port));
	removePlayer(player);
	return;
}

function on_data(player, data) {
	var chunked_array = data.split('\0');

	if (data !== null && data !== "") {
		try {
			var buffer = new Buffer(data, 'binary'); // 'binary' 'hex' 'utf8'
			//var raw_data = data.split('');
			logger.log("debug", "recieved {0}:{1} > {2}".format(player.ip_address, player.port, buffer), 'magenta');
			packets.decide(this, player, buffer);
		} catch (error) {
			logger.log("error", error);
			removePlayer(player);
			return;
		}
	}
}

function on_close(player) {
	removePlayer(player);
	return;
}

function on_error(player, error) {
	logger.log("error", "Socket error {0}:{1} > {2}".format(player.ip_address, player.port, error));
	removePenguin(player);
	return;
}

function send_data(player, data) {
	if (!player.socket.destroyed) {
		player.socket.write(data + "\0");
		logger.log("debug", "sent {0}:{1} > {2}".format(data), 'magenta');
	}
}

function disconnectAll(callback) {
	if (Object.keys(penguinsById).length == 0) {
		return callback();
	}

	for (var player in Object.keys(players)) {
		let penguin = players[penguinId];

		if (penguin !== undefined && penguin.joined) {
			removePenguin(penguin);
		}
	}

	callback();
}

function removePlayer(player) {
	try {

		if (players.indexOf(player) >= 0) {

			if (player.logged_in) {

				if (player.room !== undefined) {
					player.room.remove(penguin);
				}

				if (player.waddleId !== null) {
					let waddleEmit = 'LeaveGame-' + roomByWaddle[penguin.waddleId];
					WaddleEvent.emit(waddleEmit, penguin);
				}

				if (global.openGames[player.username] !== undefined) {
					delete global.openGames[player.username];
				}

				logger.log("info", "{0} ({1}:{2}) disconnected".format(player.username, player.ip_address, player.port), "yellow");
				api("/player/disconnect", {
					username: player.username,
					ip_address: player.ip_address,
					port: player.port,
				});
			}

			// If the player was in a game, remove the player from the game first
			if (player.room !== undefined) {
				player.room.remove(player);
			}

			var index = players.indexOf(player);

			players.splice(index, 1);

			if (player.socket !== undefined) {
				player.socket.end();
				player.socket.destroy();
			}

			logger.log("debug", "Disconnected > {0}:{1}".format(player.ip_address, player.port), 'cyan');
		}

	} catch(err) {
		logger.log("error", "Failed to disconnect player: " + err);
	}
}

module.exports.start = start;
module.exports.send_data = send_data;
module.exports.removePlayer = removePlayer;
module.exports.players = players;
module.exports.pack_emitter = pack_emitter;
module.exports.disconnectAll = disconnectAll;

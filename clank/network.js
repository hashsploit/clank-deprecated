var logger = require('./logger.js');
var packets = require('./packet.js');
var Client = require('./client.js');
var net = require('net');
var fs = require('fs');
var EventEmitter = require('events');

// Number of seconds before socket times out
const SOCKET_TIMEOUT_SECONDS = 10;
const SOCKET_TIMEOUT = 1000 * 60 * SOCKET_TIMEOUT_SECONDS;

global.clients = [];

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

	if ((clients.length + 1) > global.config.capacity) {
		// TODO: Send server full packet to client
		conn.end();
		conn.destroy();
		logger.log("warn", "The server is full. Players: " + (clients.length + 1));
		return;
	}

	let client = new Client(conn);

	player.start();
	players.push(client);

	client.ip_address = conn.remoteAddress;
	client.port = conn.remotePort;

	conn.on('data', (data) => {
		return onData(client, data);
	});
	conn.on('error', (error) => {
		return onError(client, error);
	});
	conn.on('timeout', () => {
		return onTimeout(client);
	});
	conn.once('close', () => {
		return onClose(client);
	});
}

function onTimeout(client) {
	logger.log("warn", "Connection timeout: {0}:{1}".format(client.ip_address, client.port));
	disconnectClient(client);
	return;
}

function onData(player, data) {
	//var chunked_array = data.split('\0');



	if (data !== null && data !== "") {
		try {
			var buffer = new Buffer(data, 'binary'); // 'binary' 'hex' 'utf8'
			//var raw_data = data.split('');
			logger.log("debug", "Recieved {0}:{1} > {2}".format(player.ip_address, player.port, buffer), 'magenta');
			packets.decide(this, client, buffer);
		} catch (error) {
			logger.log("error", error);
			removePlayer(player);
			return;
		}
	}
}

function onClose(player) {
	removePlayer(player);
	return;
}

function onError(player, error) {
	logger.log("error", "Socket error {0}:{1} > {2}".format(player.ip_address, player.port, error));
	removePenguin(player);
	return;
}

function sendData(client, data) {
	if (!client.socket.destroyed) {
		client.socket.write(data);
		logger.log("debug", "Sent {0}:{1} > {2}".format(data), 'magenta');
	}
}

function disconnectAll(callback) {
	if (clients.length == 0) {
		if (typeof(callback) == 'function') {
			return callback();
		}
	}

	for (var clientId in Object.keys(clients)) {
		let client = clients[clientId];

		if (penguin !== undefined) {
			disconnectClient(client);
		}
	}

	if (typeof(callback) == 'function') {
		return callback();
	}
}

function disconnectClient(client) {
	try {
		// If the client exists in the clients array
		if (clients.indexOf(client) >= 0) {

			// If this client has passed basic authentication
			if (client.authenticated) {

				// TODO: check if client is in active game/rooms
				// gracefully remove from those lists.

				logger.log("info", "Player {0} ({1}:{2}) disconnected".format(client.username, client.ip_address, client.port), "yellow");

				HTTPEvent.emit(global.config.api.url + "/player/disconnect", {
					username: client.username,
					ip_address: client.ip_address,
					port: client.port
				});
			}

			// Remove from clients array
			var index = players.indexOf(player);
			players.splice(index, 1);

			// Kill socket
			if (client.socket !== undefined) {
				client.socket.end();
				client.socket.destroy();
			}

			logger.log("debug", "Disconnected > {0}:{1}".format(player.ip_address, player.port), 'cyan');
		}

	} catch(err) {
		logger.log("error", "Failed to disconnect client: " + err);
	}
}

module.exports.start = start;
module.exports.send_data = send_data;
module.exports.removePlayer = removePlayer;
module.exports.players = players;
module.exports.pack_emitter = pack_emitter;
module.exports.disconnectAll = disconnectAll;

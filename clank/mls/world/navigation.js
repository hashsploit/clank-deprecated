var logger = require('../../util/logger.js');
var network = require('../../util/network.js');
var room = require('../room.js');
var database = require('../database/database_manager.js');
var crypto = require('crypto');

require('./buddy.js')();
require('./pet.js')();
require('./stamps.js')();
require('./game/waddle.js')();
require('./game/table.js')();

/* Navigation - j# */
module.exports = function() {
	//this.roomSpawns = [100, 110, 130, 200, 300, 400, 807];
	//this.roomSpawns = ['town'];
	this.mascotIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 7558, 884, 1316247, 8177];

	this.startDependency = function() {
	}

	this.handleJoinServer = function(penguin, data) {
		var player_id = data[0];
		var world_hash = data[1];
		var language = data[2];

		//logger.log('[' + global.world_id + '] > ' + penguin.username + ' is trying to join!', 'green');
		logger.log("debug", "Join attempt from {1} ({0}) on {2} ({3})".format(penguin.id, penguin.ipAddress, global.config.server.name, global.config.server.id));

		if (Number(player_id) !== Number(penguin.id)) {
			network.removePenguin(penguin);
			return;
		}

		// Language
		if (language !== 'en') {
			network.removePenguin(penguin);
			return;
		}

		if (world_hash == '') {
			network.removePenguin(penguin);
			return;
		}

		// Already logged in
		if (penguinsById[Number(player_id)] !== undefined) {
			network.removePenguin(penguin);
			return;
		}

		penguin.database.get_column(penguin.id, 'login_key', function(db_key) {

			if (db_key !== world_hash) {
				penguin.send('e', -1, global.error.PASSWORD_WRONG.id);
				network.removePenguin(penguin);
				return;
			}

			if (penguin.socket.destroyed) {
				network.removePenguin(penguin);
				return;
			}

			// Clear login key
			penguin.database.update_column(penguin.id, 'login_key', '');

			// If the player is a helper/moderator/administrator skip captcha
			if (penguin.permission >= 1) {
				handleJoinWorld(penguin);
				return;
			}


			// TODO: Check if this server has captcha enabled
			if (global.config.server.captcha) {
				penguin.joinedServer = true;
				penguin.send('joincaptcha', -1);
			} else {
				handleJoinWorld(penguin);
			}

			/*
			if (global.world_id !== 8888) {
				penguin.joinedServer = true;
				penguin.send('joincaptcha', -1);
			} else {
				handleJoinWorld(penguin);
			}
			*/


		});
	}

	this.handleJoinWorld = function(penguin) {
		penguin.loadPenguin(function() {

			if (penguin.socket.destroyed) {
				network.removePenguin(penguin);
				return;
			}

			if (penguinsById[Number(penguin.id)] !== undefined) { //already logged in
				network.removePenguin(penguin);
				return;
			}

			var penguinTime = new Date();
			var penguinStandardTime = penguinTime.getTime();
			// By default this is PST (GMT-8)
			const SERVER_TIMEZONE_OFFSET = 7;

			var player_string = penguin.getPlayerString();

			// 1440 is for egg timer
			let loadPlayer = [player_string, penguin.coins, penguin.chat, 1440, penguinStandardTime, penguin.age, 0, penguin.age, '', SERVER_TIMEZONE_OFFSET];

			// Join server packet
			let showModTools = Number((penguin.permission >= 2) ? 1 : 0);
			penguin.send('js', -1, 1, Number(penguin.epf), showModTools, 1);

			if (mascotIds.indexOf(penguin.id) >= 0) {
				penguin.mascot = true;
			}

			getStamps(penguin, [penguin.id], function() {
				if (penguin.socket.destroyed) {
					network.removePenguin(penguin);
					return;
				}

				sendBuddyOnline(penguin);

				getPuffles(penguin);

				penguin.send('lp', -1, loadPlayer.join('%'));

				penguin.joined = true;

				penguinsById[penguin.id] = penguin;
				penguinsByNickname[penguin.name().toLowerCase()] = penguin;

				let roomName = global.config.server.room_spawns[Math.floor(Math.random() * global.config.server.room_spawns.length)];
				let roomId = 0;
				let roomDisplayName = "";

				// Set the roomId
				for (let i in rooms) {
					let room = rooms[i];
					if (room !== undefined) {
						if (room.name == roomName && room.is_active) {
							roomId = room.external_id;
							roomDisplayName = room.display_name;
							break;
						}
					}
				}

				this.joinRoom(penguin, roomId);

				let hashedIpAddress = crypto.createHash('md5').update(penguin.ipAddress).digest("hex");

				WebhookEvent.emit('login_log', {
					"Player": "`" + penguin.name() + "`" + " [[Modify Player #" + penguin.id + "]](" + global.config.server.website + "/cp/player/" + penguin.id + ")",
					"Server": global.config.server.name + " [[Modify Server]](" + global.config.server.website + "/cp/server/" + global.config.server.name + ")",
					"Action": 'Allow',
					"Room": "#{0} {1} ({2})".format(roomId, roomName, roomDisplayName),
					"IP Address Hash": hashedIpAddress,
					"Population": Object.keys(penguinsById).length
				});

				penguin.database.update_column(penguin.id, 'current_server', global.config.server.id);
				penguin.database.setWorldDataById(global.config.server.id, 'population', Object.keys(penguinsById).length);

				// Anniversary Login
				/*
				penguin.database.get_column(penguin.id, 'anniversary_login', function(annivLogin) {
					console.log('anniv login', annivLogin);

					if (Number(annivLogin) == 0) {
						sendSystemMail(penguin, penguin.id, penguin.nickname, 300);
						penguin.database.update_column(penguin.id, 'AnniversaryLogin', 1);
					}
				});
				*/

				logger.log("info", "{0} ({1}) joined the island at {2} #{3} from {4}".format(penguin.name(), penguin.id, roomName, penguin.room.external_id, penguin.ipAddress), "yellow");
			});
		});

		if (!global.config.server.safe_chat) {
			// Send a chat encryption request to the client (Public RSA key)
			penguin.send('ems', -1, global.rsaKey.exportKey("pkcs8-public-pem"));
		}
	}

	this.handleJoinRoom = function(penguin, data) {
		if (!penguin.joined) {
			network.removePenguin(penguin);
			return;
		}

		var roomId = data[0];
		var x = data[1];
		var y = data[2];

		if (isNaN(roomId) || isNaN(x) || isNaN(y)) {
			return;
		}

		penguin.gameMode = 1;

		leaveWaddle(penguin);
		leaveTable(penguin);

		joinRoom(penguin, roomId, x, y);
	}

	this.joinRoom = function(penguin, room_id, x=0, y=0, cmd=false) {
		if (room_id in rooms) {
			if (rooms[room_id].players.indexOf(penguin) >= 0 && rooms[room_id].is_igloo == false && cmd == false) {
				network.removePenguin(penguin);
				return;
			}

			if (penguin.room !== undefined) {
				penguin.room.remove(penguin);
			}

			penguin.frame = 1;
			penguin.x = x;
			penguin.y = y;
			rooms[room_id].add(penguin);
			penguin.database.update_column(penguin.id, 'room', penguin.room.external_id);
		} else {
			// Tried joining a room that does not exist on the server list (cheating?)
			penguin.send('e', -1, -1);
			network.removePenguin(penguin);
			return;
		}
	}

	this.handleJoinPlayer = function(penguin, data) {

		if (!penguin.joined) {
			network.removePenguin(penguin);
			return;
		}

		let playerId = data[0] - 1000;
		let owner;

		penguin.database.playerIdExists(playerId, function(result) {
			if (!result) {
				network.removePenguin(penguin);
				return;
			}

			let internalId = playerId;
			let externalId = playerId + 1000;

			// if not buddy and igloo not open, return error (210 = room is full)
			// and not a moderator/administrator
			if (penguin.buddiesById[playerId] == undefined && global.openIgloos[playerId] == undefined && penguin.id !== playerId && penguin.permission <= 0) {
				penguin.send('e', penguin.room.internal_id, global.error.ROOM_FULL.id);
				return;
			}

			if (rooms[externalId] == undefined) {
				let owner = penguinsById[playerId];
				const IGLOO_CAPACITY = 150;
				rooms[externalId] = new room(externalId, internalId, IGLOO_CAPACITY, false, false, "igloo_{0}".format(owner.name().toLowerCase()), "{0}'s Igloo".format(owner.name()), true, true);
			}

			penguin.send('jp', internalId, playerId, externalId);
			this.joinRoom(penguin, externalId);

			if (penguinsById[playerId] !== undefined) {
				let owner = penguinsById[playerId];

				// party host stamp
				if (rooms[externalId].players.length >= 10) {
					owner.addStamp(17);
				}

				// igloo party stamp
				if (rooms[externalId].players.length >= 30) {
					owner.addStamp(28);
				}
			}

			// puffle owner stamp
			if (Number(playerId) == penguin.id) {
				penguin.database.getPlayerPuffles(penguin.id, function(puffles) {
					if (puffles.length >= 16) {
						penguin.addStamp(21);
					}
				});
			}

		});
	}
}

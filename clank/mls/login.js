let network = require('./network.js');
let logger = require('./logger.js');
let packets = require('./packet.js');
let room = require('./room.js');
let events = require('events');
let event_emitter = new events.EventEmitter();

let handlers = {
	'verChk': 'handle_version',
	'rndK': 'handle_random',
	'rcon': 'handle_rcon',
	'authentication': 'handle_auth',
	'login': 'handle_login'
}

let listeners = [];
let loginAttempts = {};
let loginTimestamps = {};
let loginThrottle = {};

function start(showLog) {
	for (let handler in handlers) {
		try {
			event_emitter.addListener(handler, this[handlers[handler]]);
			listeners.push(handler);
		} catch(error) {
			logger.log("error", "function " + handlers[handler] + "() for " + handler + " does not exist!");
		}
	}

	logger.log("debug", "Login::{0} XML Listener(s)".format(listeners.length), "cyan");
}

function handle(penguin, data) {
	let data_check = data.toString().replace("\0", "");

	if (data_check == '<policy-file-request/>') {
		handle_policy(penguin);
		return;
	}

	try {
		var xml_obj = et.parse(data_check);
		var body = xml_obj['_root']['_children'][0];
		var action = body['attrib']['action'].toString();
	} catch(error) {
		logger.log("warn", "Invalid XML packet recieved: " + data);
		network.removePenguin(penguin);
		return;
	}

	if (action in xml_handlers) {
		let now = new Date();
		let timestamp = Math.round(now.getTime() / 1000);

		if (loginThrottle[penguin.ipAddress] == undefined) {
			loginThrottle[penguin.ipAddress] = {};
		}

		if (loginThrottle[penguin.ipAddress][action] == undefined) {
			logger.log("debug", "Adding " + action + " to login throttle", "cyan");
			loginThrottle[penguin.ipAddress][action] = [0, timestamp];
		} else {
			loginThrottle[penguin.ipAddress][action][0]++;
			logger.log("debug", "Login throttle count (" + action + "/" + penguin.ipAddress + "): " + loginThrottle[penguin.ipAddress][action][0], "cyan");
			now.setMinutes(now.getMinutes() - 1);

			if (Math.round(now.getTime() / 1000) < Math.round(loginThrottle[penguin.ipAddress][action][1])) {
				if (loginThrottle[penguin.ipAddress][action][0] >= 100) {
					logger.log("warn", "Detected login spam from " + penguin.ipAddress + ", disconnecting player");
					network.removePenguin(penguin);
					return;
				}
			} else {
				delete loginThrottle[penguin.ipAddress][action];
			}

			if (loginThrottle[penguin.ipAddress][action] !== undefined) {
				loginThrottle[penguin.ipAddress][action][1] = timestamp;
			}
		}

		let function_string = xml_handlers[action];

		if (typeof function_string == 'string') {
			event_emitter.emit(action, penguin, body);
		}

	} else {
		logger.log("warn", "Undefined XML packet " + action + " from " + penguin.name() + " (" + penguin.id + ")");
	}
}

function handle_policy(penguin) {
	let port = global.config.server.port;
	penguin.send_data('<cross-domain-policy><allow-access-from domain="' + global.config.server.cross_domain_policy + '" to-ports="{0}" /></cross-domain-policy>'.format(port));
	network.removePenguin(penguin);
	return;
}

function handle_version(penguin, xml) {
	if (penguin.stage !== 0) {
		network.removePenguin(penguin);
		return;
	}

	penguin.stage = 1;

		// Protocol version
		if (xml['_children'][0]['attrib']['v'] == 153) {
			penguin.send_data('<msg t="sys"><body action="apiOK" r="0"></body></msg>');
			return;
		}

		penguin.send_data("<msg t='sys'><body action='apiKO' r='0'></body></msg>");

		network.removePenguin(penguin);
		return;
}

function handle_random(penguin, xml) {
	var random_key = crypto.random_key(9);

	if (penguin.stage !== 1) {
		network.removePenguin(penguin);
		return;
	}

	penguin.stage = 2;

	if (global.config.server.type == 0) {
		penguin.key = 'a94c5ed2140fc249ee3be0729e19af5a';
	} else {
		penguin.key = random_key;
	}

	penguin.send_data('<msg t="sys"><body action="rndK" r="-1"><k>{0}</k></body></msg>'.format(penguin.key));
}

function calculateWorldPopulation(population, capacity) {

	if (Number(population) <= 3) {
		return 0;
	}

	if (Number(population) >= Number(capacity)) {
		return 7;
	}

	let bars = 7;
	capacity = capacity + 100;
	let threshold = Math.round(capacity / bars);

	for (let i=0; i<bars; i++) {
		if (population <= (threshold * i)) {
			return i;
		}
	}

	return 7;
}

function handle_rcon(penguin, xml) {
	let response = "";
	let hashedKey = xml["_children"][0]["attrib"]["key"];
	let rconCommand = xml["_children"][0]["text"];

	if (penguin.stage !== 2) {
		network.removePenguin(penguin);
		return;
	}

	if (!hashedKey || !rconCommand) {
		logger.log("warn", "RCON: No key/command provided from: {0}.".format(penguin.ipAddress));
		network.removePenguin(penguin);
		return;
	}

	/*
	if (hashedKey.length != 32) {
		console.log("Not 32 chars");
		network.removePenguin(penguin);
		return;
	}
	*/

	if (hashedKey !== crypto.world_key(penguin.key + global.config.server.rcon_password)) {
		logger.log("warn", "RCON: Invalid key provided from: {0}. Got {1}, expected {2}!".format(penguin.ipAddress, hashedKey, crypto.world_key(penguin.key + global.config.server.rcon_password)));
		network.removePenguin(penguin);
		return;
	}

	// TODO: Decode/decrypt body message

	if (rconCommand == "ping") {
		response = "pong";
	}

	if (rconCommand == "os") {
		// l = linux, w = windows, m = mac, o = other
		response = "o";
		var opsys = process.platform;
		if (opsys == "darwin") {
			response = "m";
		} else if (opsys == "win32" || opsys == "win64") {
			response = "w";
		} else if (opsys == "linux") {
			response = "l";
		}
	}

	if (rconCommand == "reload") {
		logger.log("info", "RCON Reloading server ...");
		response = "ok";
		try {
			loadServerAssets();
		} catch (err) {
			logger.log("error", "An error occured while reloading the server ...");
			logger.log("error", err);
			response = err;
		}
	}

	if (rconCommand == "stop") {
		logger.log("info", "RCON Stopping server ...");
		for (let otherPenguinId in Object.keys(penguinsById)) {
			let otherPenguin = penguins[otherPenguinId];
			if (otherPenguin !== undefined) {
				otherPenguin.send('e', -1, global.error.SERVER_REBOOT.id);
			}
		}
		setTimeout(function() {
			global.stopServer();
		}, 3000);
		response = "ok";
	}

	// Multiple arguments
	else if (rconCommand.split("|").length > 0) {
		let commands = rconCommand.split("|");

		if (commands[0] == "kick") {
			let pid = Number(commands[1]);
			for (var penguinId in Object.keys(penguinsById)) {
				let otherPenguin = penguins[penguinId];
				if (otherPenguin.id == pid) {
					logger.log("info", "RCON Kicking player {0} ({1})".format(otherPenguin.name(), otherPenguin.id));
					otherPenguin.send('e', otherPenguin.room.internal_id, global.error.KICK.id);
					network.removePenguin(otherPenguin);
					response = "ok";
				} else {
					response = "Penguin not found";
				}
				break;
			}
		}

	}

	// Send response
	penguin.send_data('<msg t="sys"><body action="rcon" r="-1">{0}</body></msg>'.format(response));

	// Disconnect
	network.removePenguin(penguin);

	// Reset throttle due to successful RCON command
	let throttles = ["verChk", "rndK", "rcon"];

	for (let i in throttles) {
		if (loginThrottle[penguin.ipAddress] !== undefined) {
			if (loginThrottle[penguin.ipAddress][throttles[i]] !== undefined) {
				if (loginThrottle[penguin.ipAddress][throttles[i]][0] !== undefined) {
					loginThrottle[penguin.ipAddress][throttles[i]][0] = 0;
				}
			}
		}
	}

}

function handle_auth(penguin) {
	penguin.authPassed = true;
	penguin.protocol = packets.PROTOCOL_AS2;
	penguin.send('auth', -1, 'success');
}

function handle_login(penguin, xml) {
	var world_type = global.config.server.type;

	if (penguin.authPassed == false && world_type == 0) {
		// FIXME: handle AS3 or invalid clients

		//network.removePenguin(penguin);
		//return;

		penguin.protocol = packets.PROTOCOL_AS3;
	}

	/*
	if (penguin.authPassed == false && world_type == 'login') {
		network.removePenguin(penguin);
		return;
	}
	*/

	var zone = xml['_children'][0]['attrib']['z'];
	var nick = xml['_children'][0]['_children'][0]['text'];
	var passwd = xml['_children'][0]['_children'][1]['text'];
	//var world_type = global.config.server.type;

	logger.log("debug", "Verifying " + nick + " ...", "cyan");

	if (penguin.stage !== 2 || zone !== 'w1') {
		network.removePenguin(penguin);
		return;
	}

	/*
	if (world_type == 'game' || world_type == 'redemption') {
		return handle_world(penguin, nick, passwd);
	}
	*/

	if (world_type == 1 || world_type == 2) {
		handle_world(penguin, nick, passwd);
		return;
	}

	if (loginAttempts[penguin.ipAddress] !== undefined) {
		if (loginAttempts[penguin.ipAddress].length >= global.config.server.max_login_attempts) {
			let currentDate = Math.floor(new Date().getTime() / 1000);

			if (currentDate < loginTimestamps[penguin.ipAddress]) {
				penguin.send('e', -1, global.error.LOGIN_FLOODING.id);
				network.removePenguin(penguin);
				return;
			} else {
				delete loginAttempts[penguin.ipAddress];
				delete loginTimestamps[penguin.ipAddress];
			}
		}
	}

	penguin.database.player_exists(nick, function(result) {
		if (!result) {
			penguin.send('e', -1, global.error.NAME_NOT_FOUND.id);
			network.removePenguin(penguin);
			return;
		}

		penguin.database.get_columns_name(nick, ['id', 'password', 'buddies', 'permission', 'is_active', 'last_ip'], function(row) {
			verifyPenguin(penguin, nick, passwd, row);
		});
	});

}

function addFailedLoginAttempt(penguin) {
	if (loginAttempts[penguin.ipAddress] == undefined) {
		loginAttempts[penguin.ipAddress] = [];
	}

	let logTime = new Date();
	logTime.setHours(logTime.getHours() + 1);
	let timestamp = Math.floor(logTime.getTime() / 1000);
	loginAttempts[penguin.ipAddress].push(timestamp);

	if (loginAttempts[penguin.ipAddress].length >= global.config.server.max_login_attempts) {
		logger.log("warn", "Locking IP address '{0}' for 1 hour due to {1} failed login attempts".format(penguin.ipAddress, global.config.server.max_login_attempts));

		loginTimestamps[penguin.ipAddress] = timestamp;
	}
}

function verifyPenguin(penguin, nick, passwd, row) {
	var id = row['id'];
	var password = row['password'];
	var buddies = row['buddies'];
	var permission = parseInt(row['permission']);
	var active = row['is_active'];
	var loginIP = row['last_ip'];

	let db_password = password.split('');
	db_password[2] = 'a';
	db_password = db_password.join('');

	bcrypt.compare(passwd, db_password, function(err, result) {

		if (!result) {
			penguin.send('e', -1, global.error.PASSWORD_WRONG.id);
			addFailedLoginAttempt(penguin);
			network.removePenguin(penguin);
			return;
		}

		delete db_password;
		delete loginAttempts[penguin.ipAddress];
		delete loginTimestamps[penguin.ipAddress];

		finishLogin(penguin, id, buddies, permission, active, loginIP);
	});
}

function finishLogin(penguin, id, buddies, permission, active, loginIP) {
	let login_key = crypto.random_key(30);

	// Account is not active
	if (Number(active) == 0) {
		penguin.send('e', -1, global.error.ACCOUNT_NOT_ACTIVATE.id);
		network.removePenguin(penguin);
		return;
	}

	// Get the amount of time in seconds this player is banned for in total
	penguin.database.getPlayerBanTime(id, function(banTime) {
		// Perma-banned
		if (banTime == -1) {
			// Send s603 "<b>Banned:</b> You are banned forever"
			penguin.send('e', -1, global.error.BAN_FOREVER.id);
			network.removePenguin(penguin);
			return;
		}

		// Temp-banned
		let banDate = new Date(1970, 0, 1); // UNIX Epoch
		banDate.setSeconds(banTime);
		let hoursBanned = banDate.getHours();

		if (hoursBanned > 0) {

			if (hoursBanned == 1) {
				// Send s602 "<b>Banned:</b>\nYour ban will expire within the hour."
				penguin.send('e', -1, global.error.BAN_AN_HOUR.id);
				network.removePenguin(penguin);
				return;
			}

			// Send s601 "<b>Banned:</b>\nYou are banned for the next {0} {1}."
			penguin.send('e', -1, global.error.BAN_DURATION.id, hoursBanned, "hours");
			network.removePenguin(penguin);
			return;
		}


	});

	penguin.database.update_column(id, 'login_key', login_key);
	penguin.key = '';

	let loginDate = new Date().getTime() / 1000;


}

function handle_world(penguin, nick, login_key) {

	penguin.database.player_exists(nick, function(result) {
		if (!result) {
			penguin.send('e', -1, global.error.NAME_NOT_FOUND.id);
			network.removePenguin(penguin);
			return;
		}

		if (login_key == '') {
			network.removePenguin(penguin);
			return;
		}

		penguin.database.get_columns_name(nick, ['login_key', 'id', 'username', 'is_member', 'permission', 'last_ip'], function(row) {
			let id = row['id'];
			let username = row['username'];
			let member = row['is_member'];
			let permission = row['permission'];
			let db_password = row['login_key'];
			let world_hash = crypto.world_key(db_password + penguin.key) + db_password;
			let lastIp = row['last_ip'];

			if (lastIp.indexOf(penguin.ipAddress) == -1) { // trying to compromise acc...
				penguin.send('e', -1, global.error.PASSWORD_WRONG.id);
				network.removePenguin(penguin);
				return;
			}

			if (world_hash !== login_key) {
				penguin.send('e', -1, global.error.PASSWORD_WRONG.id);
				network.removePenguin(penguin);
				return;
			}

			if (global.config.server.staff_only && permission <= 1) { // 1 = Helper 2 = Moderator, 3 = Administrator
				logger.log("warn", "Non-moderator account attempting to login!");

				WebhookEvent.emit('login_log', {
					"Type": 'Non-staff account attempting to login to staff server',
					"Player": "`" + username + "`" + " [[Modify Player #" + id + "]](" + global.config.server.website + "/cp/player/" + id + ")",
					"Server": global.config.server.name + " [Modify Server](" + global.config.server.website + "/cp/server/" + global.config.server.name + ")",
					"Action": "Removed from network"
				});

				// Error 10004 The connection has been lost. Thank you for playing Club Penguin. Waddle on!
				//penguin.send('e', -1, global.error.SOCKET_LOST_CONNECTION.id);

				// System automatically removed you
				penguin.send('e', -1, global.error.GAME_CHEAT.id);

				network.removePenguin(penguin);
				return;
			}

			penguin.id = id;
			penguin.username = username;
			penguin.member = member;
			penguin.permission = permission;
			penguin.identified = true;

			penguin.send('l', -1, global.config.server.club_penguin);
		});
	});
}

module.exports.start = start;
module.exports.handle = handle;
module.exports.handle_policy = handle_policy;
module.exports.handle_version = handle_version;
module.exports.handle_random = handle_random;
module.exports.handle_auth = handle_auth;
module.exports.handle_login = handle_login;
module.exports.handle_rcon = handle_rcon;

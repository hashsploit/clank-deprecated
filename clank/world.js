var logger = require('./logger.js');
var network = require('./network.js');
var fs = require('fs');
var events = require('events');
var threading = require('threads');

// Allow self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let wwwrequest = require("sync-request");

var event_emitter = new events.EventEmitter();

global.ThreadPool = new threading.Pool();

xt_handlers = {
	's': {
		'j#js': {event: 'handleJoinServer', throttle: false},
		'j#jr': {event: 'handleJoinRoom', throttle: true, interaction: true},
		'j#jp': {event: 'handleJoinPlayer', throttle: true, interaction: true},

		'f#epfga': {event: 'getAgentStatus', throttle: false},
		'f#epfsa': {event: 'setAgentStatus', throttle: false},
		'f#epfgf': {event: 'getFieldStatus', throttle: false},
		'f#epfsf': {event: 'setFieldStatus', throttle: false},
		'f#epfgr': {event: 'getAgentRank', throttle: false},
		'f#epfgrantreward': {event: 'grantReward', throttle: true},
		'f#epfai': {event: 'purchaseSpyGear', throttle: true},

		'i#gi': {event: 'getInventory', throttle: true},
		'i#ai': {event: 'buyInventory', throttle: true},
		'i#qpp': {event: 'getPlayerPins', throttle: true},
		'i#qpa': {event: 'getPlayerAwards', throttle: true},

		'b#gb': {event: 'getBuddies', throttle: true},
		'b#br': {event: 'sendBuddyRequest', throttle: true},
		'b#rb': {event: 'sendBuddyRemove', throttle: false},
		'b#ba': {event: 'acceptBuddy', throttle: false},
		'b#bf': {event: 'findBuddy', throttle: true},

		'n#gn': {event: 'getIgnores', throttle: true},
		'n#an': {event: 'addIgnorePlayer', throttle: true},
		'n#rn': {event: 'removeIgnorePlayer', throttle: true},

		'l#mst': {event: 'startMail', throttle: true},
		'l#mg': {event: 'getMail', throttle: true},
		'l#mc': {event: 'mailChecked', throttle: true},
		'l#ms': {event: 'sendMail', throttle: true},
		'l#md': {event: 'deleteMailItem', throttle: false},
		'l#mdp': {event: 'deleteMailItemFromPlayer', throttle: false},

		'st#gps': {event: 'getStamps', throttle: true},
		'st#sse': {event: 'addStamp', throttle: true},
		'st#gmres': {event: 'getRecentStamps', throttle: false},
		'st#gsbcd': {event: 'getBookCover', throttle: false},
		'st#ssbcd': {event: 'updateBookCover', throttle: true},

		'u#h': {event: 'sendHeartbeat', throttle: false, interaction: true},
		'u#se': {event: 'sendEmote', throttle: true, interaction: true},
		'u#ss': {event: 'sendSafeChat', throttle: true, interaction: true},
		'u#sg': {event: 'sendTourMessage', throttle: true, interaction: true},
		'u#sp': {event: 'sendPosition', throttle: false, interaction: true},
		'u#sb': {event: 'sendSnowball', throttle: true, interaction: true},
		'u#sf': {event: 'sendFrame', throttle: false, interaction: true},
		'u#sa': {event: 'sendAction', throttle: true, interaction: true},
		'u#sl': {event: 'sendLine', throttle: true, interaction: true},
		'u#sj': {event: 'sendJoke', throttle: true, interaction: true},
		'u#glr': {event: 'sendLastRevision', throttle: false},
		'u#gp': {event: 'getPlayer', throttle: true},
		'u#tp': {event: 'sendTeleport', throttle: true, enabled: false, interaction: true},
		'u#sma': {event: 'sendMascotMessage', throttle: false},

		's#upc': {event: 'updatePlayerClothing', throttle: true},
		's#uph': {event: 'updatePlayerClothing', throttle: false},
		's#upf': {event: 'updatePlayerClothing', throttle: false},
		's#upn': {event: 'updatePlayerClothing', throttle: false},
		's#upb': {event: 'updatePlayerClothing', throttle: false},
		's#upa': {event: 'updatePlayerClothing', throttle: false},
		's#upe': {event: 'updatePlayerClothing', throttle: false},
		's#upp': {event: 'updatePlayerClothing', throttle: false},
		's#upl': {event: 'updatePlayerClothing', throttle: false},

		'g#gm': {event: 'getActiveIgloo', throttle: true},
		'g#or': {event: 'openIgloo', throttle: false},
		'g#cr': {event: 'closeIgloo', throttle: false},
		'g#go': {event: 'getOwnedIgloos', throttle: true},
		'g#gf': {event: 'getFurnitureList', throttle: true},
		'g#ur': {event: 'saveIglooFurniture', throttle: true},
		'g#um': {event: 'updateIglooMusic', throttle: false},
		'g#gr': {event: 'sendServerIglooList', throttle: true},
		'g#ag': {event: 'buyIglooFloor', throttle: true},
		'g#au': {event: 'buyIglooType', throttle: true},
		'g#af': {event: 'buyFurniture', throttle: true},
		'g#ao': {event: 'updateIglooType', throttle: true},

		'm#sm': {event: 'sendMessageRequest', throttle: true},
		'm#r': {event: 'reportPlayer', throttle: true},
		'm#ems': {event: 'setupEncryptedMessageRequest', throttle: true}, // Custom protocol
		'm#em': {event: 'sendEncryptedMessageRequest', throttle: true}, // Custom protocol

		'p#pgu': {event: 'getPuffles', throttle: true},
		'p#pg': {event: 'getPufflesByPlayerId', throttle: true},
		'p#pt': {event: 'sendPuffleTreat', throttle: true},
		'p#pf': {event: 'sendPuffleFeed', throttle: true},
		'p#pip': {event: 'sendPuffleInitInteractionPlay', throttle: true},
		'p#pir': {event: 'sendPuffleInitInteractionRest', throttle: true},
		'p#ir': {event: 'sendPuffleInteractionRest', throttle: true},
		'p#ip': {event: 'sendPuffleInteractionPlay', throttle: true},
		'p#pr': {event: 'sendPuffleRest', throttle: true},
		'p#pp': {event: 'sendPufflePlay', throttle: true},
		'p#pb': {event: 'sendPuffleBath', throttle: true},
		'p#ps': {event: 'sendPuffleFrame', throttle: true},
		'p#pw': {event: 'sendPuffleWalk', throttle: true},
		'p#pm': {event: 'sendPuffleMove', throttle: true},
		'p#pn': {event: 'sendAdoptPuffle', throttle: true},

		'w#jx': {event: 'joinWaddle', throttle: false},

		'a#gt': {event: 'handleGetTables', throttle: false},
		'a#jt': {event: 'handleJoinTable', throttle: false},
		'a#lt': {event: 'handleLeaveTable', throttle: false},

		'r#cdu': {event: 'coinsDigUpdate', throttle: false},

		't#at': {event: 'openPlayerBook', throttle: true},
		't#rt': {event: 'closePlayerBook', throttle: true},

		'o#k': {event: 'kickPlayerById', throttle: false},
		'o#m': {event: 'mutePlayerById', throttle: false},
		'o#b': {event: 'banPlayerAction', throttle: false},

		'e#dc': {event: 'donateCoinsForChange', throttle: true},

		'cpc#captchaverify': {event: 'verifyCaptchaToken', throttle: true}, // Custom protocol

		'ni#gnr': {event: 'handleGetNinjaRank', throttle: false},
		'ni#gnl': {event: 'handleGetNinjaLevel', throttle: false},
		'ni#gwl': {event: 'handleGetWaterLevel', throttle: false},
		'ni#gfl': {event: 'handleGetFireLevel', throttle: false},
		'ni#gcd': {event: 'handleGetCardData', throttle: true},

		'lb#glb': {event: 'getLeaderboardList', throttle: true},
		'lb#sgm': {event: 'handleSetGameMode', throttle: true},

		'survey#playawards': {event: 'playAwards', throttle: true},
		'survey#chkv': {event: 'checkHasVoted', throttle: true},

		'e#dc': {event: 'donateCoins', throttle: true}
	},

	'z': {
		'zo': {event: 'handleGameOver', throttle: true},
		'zr': {event: 'handleGameRestart', throttle: true}, // Restart the game (same settings)

		'gw': {event: 'handleGetWaddles', throttle: false},
		'jw': {event: 'handleSendJoinWaddleById', throttle: false},
		'lw': {event: 'handleLeaveWaddle', throttle: false},
		'jz': {event: 'handleStartGame', throttle: false}, // Join Game
		'lz': {event: 'handleLeaveGame', throttle: false}, // Leave Game
		'uz': {event: 'handleStartGame', throttle: false}, // Player List
		'zm': {event: 'handleSendMove', throttle: false}, // Player Action

		'ggd': {event: 'getGameData', throttle: false},
		'sgd': {event: 'saveGameData', throttle: false},

		'm': {event: 'sendMovePuck', throttle: false},
		'gz': {event: 'getGame', throttle: false},
		'zd': {event: 'handleChangeDifficulty', throttle: false},
		'cz': {event: 'handleAbortGame', throttle: false},

		'jmm': {event: 'handleJoinMatchMaking', throttle: false},
		'lmm': {event: 'handleLeaveMatchMaking', throttle: false},

		'jsen': {event: 'handleJoinSensei', throttle: false}
	},

	'red': {
		'rjs': {event: 'handleRedemptionJoinServer', throttle: false},
		'rsc': {event: 'handleRedemptionSendCode', throttle: true}
	}
};

dependencyHandlers = {};

events_array = [];

global.rooms = {};
global.items = {};
global.igloos = {};
global.furniture = {};
global.floors = {};
global.game_stamps = {};
global.cards = {};
global.cardsById = {};
global.cardsObject = [];
global.epfItems = {};

global.postcards = [];
global.__stamps = [];
global.cardsArray = [];
global.pins = {};
global.pinArr = [];
global.awards = {};

global.puffles = {};
global.puffleItems = [];

global.openIgloos = {};

global.eventWhitelist = {};

function start() {

	// Not a world game server
	if (global.config.server.type !== 1) {
		logger.log("info", "{0} server started".format(global.config.server.type == 0 ? "Login" : "Redemption"), 'green');
		return;
	}

	for (let index in dependencies['world']) {
		var dependency = dependencies['world'][index];
		var dependencyName = dependency['name'];
		var dependencyDirectory = dependency['directory'];
		var dependencyExtension = dependency['extension'];
		var dependencyDetails = [dependencyDirectory, dependencyName, dependencyExtension];

		try {
			let handler = require(dependencyDetails.join(''));

			let func = handler();

			if (func != undefined) {
				func.startDependency();
			}

			dependencyHandlers[dependencyName] = func;
		} catch (error) {
			logger.log("error", 'DependencyLoader::Error > ' + error, 'red');
			logger.log("error", error.stack);
		}
	}

	for (let index in dependencies['services']) {
		var service = dependencies['services'][index];
		var serviceName = service['name'];
		var serviceDirectory = './events/';
		var serviceExtension = service['extension'];
		var serviceDetails = [serviceDirectory, serviceName, serviceExtension];

		try {
			require(serviceDetails.join(''));
		} catch(error) {
			logger.log("error", 'ServiceLoader::Error > ' + error, 'red');
		}
	}


	// Load server assets
	loadServerAssets();

	for (var type in xt_handlers) {
		for (var handler in xt_handlers[type]) {
			try {
				// If the xt_handler is not enabled
				if (xt_handlers[type][handler].enabled == false) {
					continue;
				}
				event_emitter.addListener(handler, global[xt_handlers[type][handler].event]);
				events_array.push(handler);
			} catch(error) {
				logger.log("error", "function {0}() for {1}#{2} packet does not exist!".format(xt_handlers[type][handler].event, type, handler));
			}
		}
	}

	//serverDate = new Date();
	//serverDate.setHours(serverDate.getHours() - 8);

	var listeners = events_array.length;
	var rooms_count = Object.keys(global.rooms).length;
	var items_count = Object.keys(global.items).length;
	var igloos_count = Object.keys(global.igloos).length;
	var furniture_count = Object.keys(global.furniture).length;
	var floor_count = Object.keys(global.floors).length;
	var puffle_count = Object.keys(global.puffles).length;
	var postcard_count = Object.keys(global.postcards).length;
	var stamps_count = Object.keys(global.game_stamps).length;
	var cards_count = global.cardsArray.length;

	logger.log("debug", "World::{0} XT Listener(s)".format(listeners));

	logger.log("info", "World server started", "green");
}



/**
 * Load files from local assets or from API if global.config.api.endpoint is set.
 */
function loadServerAssets() {
	// Reset all previous values
	global.rooms = {};
	global.items = {};
	global.igloos = {};
	global.furniture = {};
	global.floors = {};
	global.game_stamps = {};
	global.cards = {};
	global.cardsById = {};
	global.cardsObject = [];
	global.epfItems = {};
	global.postcards = [];
	global.__stamps = [];
	global.cardsArray = [];
	global.pins = {};
	global.pinArr = [];
	global.awards = {};
	global.puffles = {};
	global.puffleItems = [];
	global.openIgloos = {};
	global.eventWhitelist = {};

	let _rooms = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/rooms crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/rooms", options);
			_rooms = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get rooms crumb data from API server!");
			logger.log("error", err);
			process.exit(1);
		}
	} else {
		_rooms = require("../crumbs/rooms.json");
	}

	for (let index in Object.values(_rooms)) {
		let external_id = _rooms[index]['room_id'];
		let is_game = ((!_rooms[index]['path']) ? true : false);
		let capacity = (_rooms[index]['capacity'] == undefined ? 100 : Number(_rooms[index]['capacity']));
		let solo = ((!_rooms[index]['is_solo']) ? false : true);
		let internal_id = Object.keys(rooms).length * 2;
		let name = _rooms[index]['name'];
		let display_name = ((!_rooms[index]['display_name']) ? name : _rooms[index]['display_name']);
		let is_active = ((!_rooms[index]['is_active']) ? false : true);

		logger.log("debug", "Adding room #" + external_id + " " + name + " (" + display_name + ")");

		global.rooms[external_id] = new room(external_id, internal_id, capacity, is_game, solo, name, display_name, false, is_active);
	}

	logger.log("info", "Loaded {0} rooms.".format(Object.keys(global.rooms).length));

	let _stamps = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/stamps crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/stamps", options);
			_stamps = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get stamps crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_stamps = require("../crumbs/stamps.json");
	}

	for (let index in _stamps) {
		let stamp_cat = _stamps[index];
		if (stamp_cat['parent_group_id'] == 8) {
			for (let _index in stamp_cat['stamps']) {
				var stamp = stamp_cat['stamps'][_index];

				for(var __index in _rooms) {
					var display = stamp_cat['display'];

					if (display.replace('Games : ', '') == _rooms[__index]['display_name']) {
						var room_id = _rooms[__index]['room_id'];

						for(var i in stamp_cat['stamps']) {
							global.__stamps.push(stamp_cat['stamps'][i]['stamp_id']);
						}

						global.game_stamps[room_id] = {};
						global.game_stamps[room_id] = global.__stamps;
						global.__stamps = [];
					}
				}
			}
		}
		delete _stamps[index];
	}

	logger.log("info", "Loaded {0} stamps.".format(Object.keys(global.game_stamps).length));


	var _catalogues = {};
	var _whitelist = [];
	var witems_count = 0;
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/buyable_items crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/buyable_items", options);
			_catalogues = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get buyable_items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_catalogues = require("../crumbs/buyable_items.json");
	}
	for (var index in _catalogues) {
		var itemId = _catalogues[index]['paper_item_id'];
		_whitelist.push(itemId);
		witems_count++;
		delete _catalogues[index];
	}

	logger.log("info", "Loaded {0} buyable items.".format(_whitelist.length));


	var _items = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/items crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/items", options);
			_items = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_items = require('../crumbs/items.json');
	}
	for (var index in _items) {
		var itemId = _items[index]['paper_item_id'];
		var prompt = _items[index]['prompt'];
		var cost = _items[index]['cost'];
		var type = _items[index]['type'];
		var whitelisted = false;

		if (_whitelist.indexOf(itemId) >= 0) {
			whitelisted = true;
		}

		if (_items[index]['is_epf'] !== undefined) {
			global.epfItems[itemId] = [cost, prompt];
		}

		if (type == 10) {
			global.awards[itemId] = [itemId, prompt];
		}

		global.items[itemId] = [cost, prompt, whitelisted, type];

		delete _items[index];
	}

	logger.log("info", "Loaded {0} items.".format(Object.keys(global.items).length));


	var _pins = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/pins crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/pins", options);
			_pins = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_pins = require('../crumbs/pins.json');
	}
	for (var index in _pins) {
		var pinId = _pins[index]['paper_item_id'];
		var label = _pins[index]['label'];
		var timestamp = _pins[index]['unix'];

		global.pins[pinId] = [pinId, label, timestamp];
		global.pinArr.push(pinId);
		delete _pins[index];
	}

	logger.log("info", "Loaded {0} pins.".format(Object.keys(global.pins).length));



	var _igloos = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/igloos crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/igloos", options);
			_igloos = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_igloos = require('../crumbs/igloos.json');
	}
	for (var index in _igloos) {
		var iglooId = _igloos[index]['igloo_id'];
		var cost = _igloos[index]['cost'];

		global.igloos[iglooId] = cost;
		delete _igloos[index];
	}

	logger.log("info", "Loaded {0} igloo types.".format(Object.keys(global.igloos).length));



	var _furniture = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/furniture crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/furniture", options);
			_igloos = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_furniture = require('../crumbs/igloo_furniture.json');
	}
	for (var index in _furniture) {
		var furnitureId = _furniture[index]['furniture_item_id'];
		var cost = _furniture[index]['cost'];

		global.furniture[furnitureId] = cost;
		delete _furniture[index];
	}

	logger.log("info", "Loaded {0} furniture types.".format(Object.keys(global.furniture).length));


	var _floors = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/floors crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/floors", options);
			_igloos = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_floors = require('../crumbs/igloo_floors.json');
	}
	for (var index in _floors) {
		var floorId = _floors[index]['igloo_floor_id'];
		var cost = _floors[index]['cost'];

		global.floors[floorId] = cost;
		delete _floors[index];
	}

	logger.log("info", "Loaded {0} igloo floor types.".format(Object.keys(global.floors).length));


	var _puffles = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/puffles crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/puffles", options);
			_igloos = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_puffles = require('../crumbs/puffles.json');
	}
	for (var index in _puffles) {
		var puffleId = _puffles[index]['puffle_id'];
		var puffleItem = '75' + puffleId;
		var cost = _puffles[index]['cost'];
		var maxHealth = _puffles[index]['max_health'];
		var maxHunger = _puffles[index]['max_hunger'];
		var maxRest = _puffles[index]['max_rest'];

		global.puffles[puffleId] = [puffleId, puffleItem, cost, maxHealth, maxHunger, maxRest];
		global.puffleItems.push(Number(puffleItem));
		delete _puffles[index];
	}

	logger.log("info", "Loaded {0} puffle types.".format(Object.keys(global.puffles).length));



	var _postcards = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/postcards crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/postcards", options);
			_igloos = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_postcards = require('../crumbs/postcards.json');
	}
	for (var index in _postcards) {
		var postcardId = _postcards[index]['postcard_id'];
		global.postcards.push(postcardId);
		delete _postcards[index];
	}

	logger.log("info", "Loaded {0} postcard types.".format(Object.keys(global.postcards).length));



	var cardAmount = 0;
	var _cards = {};
	if (global.config.api.endpoint) {
		try {
			logger.log("debug", "Downloading {0}/card_jitsu_cards crumb ...".format(global.config.api.endpoint));
			let options = {
				json: true,
				rejectUnauthorized: false,
				insecure: true
			};
			let req = wwwrequest("GET", global.config.api.endpoint + "/card_jitsu_cards", options);
			_igloos = JSON.parse(req.getBody('utf-8'));
		} catch (err) {
			logger.log("error", "Failed to get items crumb data from API server!");
			logger.log("error", err);
		}
	} else {
		_cards = require('../crumbs/card_jitsu_cards.json');
	}
	for (var index in _cards) {
		cardAmount++;

		if (cardAmount > 300) {
			break;
		}

		var cardType = _cards[index]['card_id'];
		var cardElement = _cards[index]['element'];
		var cardValue = _cards[index]['value'];
		var cardColor = _cards[index]['color'];
		var cardPowerId = _cards[index]['power_id'];
		var cardDetails = [index, cardType, cardElement, cardValue, cardColor, cardPowerId];

		global.cardsObject.push({
			id: cardType,
			genericIndex: index,
			element: cardElement,
			value: cardValue,
			color: cardColor,
			power: cardPowerId,
			details: cardDetails.join('|')
		});

		global.cardsArray.push(cardDetails.join('|'));
		global.cardsById[cardType] = cardDetails.join('|');
		global.cards[index] = cardDetails;

		delete _cards[index];
	}

	logger.log("info", "Loaded {0} card jitsu card types.".format(Object.keys(global.cards).length));

}






function getServerTime() {
	serverDate = new Date();
	// Default to PST (GMT-8)
	serverDate.setHours(serverDate.getHours() - 7);
	return serverDate;
}

function handle(player, data) {
	var data_check = data.toString().replace("\0", "");
	var data_explode = data.split('%');
	var extension = data_explode[1];
	var type = data_explode[2];
	var handler = data_explode[3];
	var internalId = data_explode[4];
	var handleData = data_explode.splice(5);
	
	handleData.pop();

	if ((data_explode || extension || type || handler || internalId) == undefined) {
		network.removePenguin(penguin);
		return;
	}

	if (penguin.identified !== true && penguinsById[penguin.id] == undefined && handler !== 'f#epfgf') {
		network.removePenguin(penguin);
		return;
	}

	if (handler in xt_handlers[type] && events_array.indexOf(handler) >= 0) {
		if (penguin.joined == true && penguin.room !== undefined) {
			if (penguin.database !== undefined && xt_handlers[type][handler].interaction == true) {
				if (penguin.kickRequest == 0) {
					penguin.kickRequest = (new Date().getTime() / 1000);
				} else {
					let now = new Date();

					now.setMinutes(now.getMinutes() - 2);

					if ((now / 1000) >= penguin.kickRequest) {
						penguin.kickRequest = 0;

						/*
						penguin.database.get_column(penguin.id, 'is_kicked', function(kicked) {
							if (Number(kicked) !== 0) {
								penguin.database.update_column(penguin.id, 'is_kicked', 0);
								penguin.send('e', -1, 5);
								network.removePenguin(penguin);
								return;
							}
						});
						*/

					}
				}
			}

			if (Number(penguin.room.internal_id) !== Number(internalId) && Number(internalId) !== -1) {
				logger.log("error", "Incorrect internal ID", "red");
				return;
			}

			var now = new Date();
			var timestamp = (now.getTime() / 1000);

			// Bypass throttle if player permission is >= 2 (moderator)
			if (xt_handlers[type][handler].throttle == true && (handler !== "zo" && penguin.room.is_game == false && penguin.permission < 2)) {
				if (penguin.throttle[handler] == undefined) {
					penguin.throttle[handler] = [0, timestamp];

					logger.log("debug", "Throttle::Adding handler ({0}) to {1}".format(handler, penguin.name()), "cyan");
				} else {
					penguin.throttle[handler][0]++;

					now.setMinutes(now.getMinutes() - 1);

					logger.log("debug", 'Throttle::[{0}] handler ({1}) count: {2}'.format(penguin.name(), handler, penguin.throttle[handler][0]), 'cyan');

					if (Math.round(now.getTime() / 1000) < Math.round(penguin.throttle[handler][1])) {
						logger.log("debug", 'Throttle::Checking handler ({0}) from {1}'.format(handler, penguin.name()), 'cyan');

						if (penguin.throttle[handler][0] >= 150) {
							logger.log("warn", 'Detected threat from ' + penguin.name() + ', removing player.', 'red');
							penguin.send('e', -1, global.error.GAME_CHEAT.id);
							network.removePenguin(penguin);
							return;
						}

						if (penguin.throttle[handler][0] >= 100 && penguin.permission <= 1) {
							logger.log("warn", 'Detected threat from ' + penguin.name() + ', throttling.');
							return;
						}
					} else {
						logger.log("debug", 'Throttle::Removing handler ({0}) from {1}'.format(handler, penguin.name()), 'cyan');

						delete penguin.throttle[handler];
					}

					if (penguin.throttle[handler] !== undefined) {
						logger.log("debug", 'Throttle::Updating timestamp ({0}) from {1}'.format(handler, penguin.name()), 'cyan');

						penguin.throttle[handler][1] = timestamp;
					}
				}
			}
		}

		try {
			event_emitter.emit(handler, penguin, handleData, data_explode);
		} catch(error) {
			logger.log("error", error);
			logger.log("error", error.stack);

			if (penguin.permission < 3) {
				network.removePenguin(penguin);
			}

			return;
		}
	} else {
		logger.log("warn", 'undefined XT packet > ' + handler, 'red');
	}
}

global.getServerTime = getServerTime;

module.exports.start = start;
module.exports.handle = handle;
module.exports.getServerTime = getServerTime;
module.exports.loadServerAssets = loadServerAssets;

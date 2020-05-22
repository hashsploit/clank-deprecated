var logger = require('./logger.js');
var network = require('./network.js');
var fs = require('fs');
var dependencies = require('./dependencies.json');
var events = require('events');
var event_emitter = new events.EventEmitter();

// Allow self-signed certificate (debug only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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

	// Not MLS
	if (global.config.mode !== "mls") {
		logger.log("info", "Server started", 'green');
		//return;
	}

/*
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
*/

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
	/*
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
	*/

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






module.exports.start = start;
module.exports.handle = handle;
module.exports.getServerTime = getServerTime;
module.exports.loadServerAssets = loadServerAssets;

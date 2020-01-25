let chalk = require("chalk");
let logger = require('./clank/logger.js');
let network = require('./clank/network.js');
let packets = require('./clank/packet.js');
let parameters = process.argv;

require('./clank/util.js')();

global.name = "clank";
global.version = "0.1.0";

if (parameters.length < 3) {
	console.error("Server configuration file must be specified e.g: \"nodejs server.js aquatos.json\" where aquatos.json is in /config/aquatos.json");
	process.exit(-1);
}

let serverConfig = parameters[2];

try {
	global.config = require("./config/" + serverConfig);
} catch (err) {
	console.error("Server configuration file does not exist in /config/{0}".format(serverConfig));
	process.exit(-1);
}

global.stopServer = function() {
	network.disconnectAll(function() {
		logger.log("warn", "Shutting down server ...");
		process.exit(0);
	});
}

let logo = [
	"_|_|_|  _|          _|_|    _|      _|  _|    _|",
	"_|      _|        _|    _|  _|_|    _|  _|  _|",
	"_|      _|        _|_|_|_|  _|  _|  _|  _|_|",
	"_|      _|        _|    _|  _|    _|_|  _|  _|",
	"_|_|_|  _|_|_|_|  _|    _|  _|      _|  _|    _|  v{0}".format(global.version)
];

let bolt = [
" _________ ",
"| \\/   \\/ |",
"|_/\\___/\\_|",
"  |\\ \\ \\|  ",
"  | \\ \\ |  Name      : {0}".format(global.config.name),
"  |\\ \\ \\|  Address   : {0}:{1}".format((global.config.address ? global.config.address : "*"), global.config.port),
"  | \\ \\ |  Capacity  : {0}".format(global.config.capacity),
"  |\\ \\ \\|  Whitelist : {0}".format(global.config.whitelist.enabled ? "[" + global.config.whitelist.list.join(", ") + "]" : "Off"),
"  | \\ \\ |  Operators : {0}".format(global.config.operators !== null ? "[" + global.config.operators.join(", ") + "]" : "None"),
"  |\\ \\ \\|  ",
"  '-----'  "
];

console.log(chalk["cyan"].bold(logo.join("\n")) + "\n");
console.log(chalk["cyan"].bold(bolt.join("\n")) + "\n");

logger.setLogLevel(global.config.log_level);
logger.log("info", "Starting {0} v{1} (Ratchet & Clank 3 Server) ...".format(global.name, global.version), "cyan");

if (global.config.api.url) {
	logger.log("debug", "Broadcasting server start ...".format(global.config.api.url));
	api("/start");
}

logger.log("info", "Server Name: {0}".format(global.config.name));
logger.log("info", "Server Address: {0}:{1}".format((global.config.address ? global.config.address : "*"), global.config.port));
logger.log("info", "Server Capacity: {0}".format(global.config.capacity));
logger.log("info", "Server Whitelist: {0}".format(global.config.whitelist.enabled ? "Enabled [" + global.config.whitelist.list.join(", ") + "]" : "Disabled"))
logger.log("info", "Server Operators: {0}".format(global.config.operators !== null ? "[" + global.config.operators.join(", ") + "]" : "None"))

packets.start(true);
network.start(global.config.address, global.config.port);

var network = require('./network.js');
var logger = require('./logger.js');
var os = require('os');

function Room(external_id, internal_id, capacity, is_game, is_solo, name, display_name, is_igloo, is_active=true) {
	this.players = [];
	this.external_id = external_id;
	this.internal_id = internal_id;
	this.is_game = is_game;
	this.capacity = capacity;
	this.is_solo = is_solo;
	this.name = name;
	this.display_name = display_name;
	this.is_igloo = is_igloo;
	this.is_active = is_active;

	if (name == "staff") {
		this.staffPanelUpdateInterval = setInterval(function(s) {
			s.pushStaffPanelUpdate();
		}, 1000, this);
	}

	this.send = function(penguin, ...arguments) {
		var to_send = '%xt%' + arguments.join('%') + '%';

		Promise.each(this.players, (player) => {
			// If the player is not ignoring this penguin, then send data
			if (player.ignoresById[penguin.id] == undefined) {
				player.send_data(to_send);
			}
		});
	}

	this.getRoomString = function() {
		let availablePlayers = this.players.filter(p => penguinsById[p.id] !== undefined);
		let roomString = availablePlayers.map(p => p.getPlayerString());

		return roomString.join('%');
	}

	this.add = function(penguin) {

		// If the room is full and player is not a moderator
		if (this.players.length > (this.capacity - 1) && penguin.permission <= 1) {
			penguin.send('e', this.internal_id, global.error.ROOM_FULL.id);
			return;
		}

		// If this room is a solo room, hide all other players
		if (this.is_solo) {
			this.players = [];
		}

		this.players.push(penguin);

		let roomString = this.getRoomString();

		// hide command
		if (roomString.length == 0) {
			roomString = penguin.getPlayerString();
		}

		if (this.is_game) {
			penguin.send('jg', this.internal_id, this.external_id);
		} else {
			penguin.send('jr', this.internal_id, this.external_id, roomString);

			if (!this.is_solo) {
				this.send(penguin, 'ap', this.internal_id, penguin.getPlayerString());
			}
		}

		penguin.room = this;

		MascotEvent.emit('MascotEnterRoom', penguin);
		MascotEvent.emit('AddPlayer', penguin);
	}

	this.remove = function(penguin) {
		let index = this.players.indexOf(penguin);

		if (index == -1) {
			return;
		}

		this.players.splice(index, 1);

		this.send(penguin, 'rp', this.internal_id, penguin.id);
	}

	this.pushStaffPanelUpdate = function() {
		if (this.players.length == 0) {
			return;
		}

		let data = [];

		// board 1
		data.push("Island Pop: " + Object.keys(penguinsById).length);

		// board 2
		data.push("OS: " + os.type() + " " + os.arch());

		// board 3
		//os.uptime();
		var date = new Date();
		var hours = (date.getHours() <= 9) ? "0" + date.getHours() : date.getHours();
		var minutes = (date.getMinutes() <= 9) ? "0" + date.getMinutes() : date.getMinutes();
		var seconds = (date.getSeconds() <= 9) ? "0" + date.getSeconds() : date.getSeconds();

		data.push("Time: " + hours + ":" + minutes + ":" + seconds);

		// board 4
		data.push("CPUs: x" + os.cpus().length);

		Promise.each(this.players, (player) => {
			player.send('cpcstaffdata', data.join("%"));
		});
	}

	this.destroy = function() {
		if (this.staffPanelUpdateInterval !== undefined) {
			clearInterval(this.staffPanelUpdateInterval);
		}
	}
}

module.exports = Room;

var network = require('./network.js');
var logger = require('./logger.js');

function Player(socket) {
	this.username;
	this.socket = socket;
	this.stage = 0; // Connection stage (before logged_in is set to true)
	this.logged_in = false;
	this.operator = false;
	this.muted = false;
	this.clan = null;
	this.buddies = {};
	this.buddy_requests = {};
	this.game = {
		host: false,
		// game_name: null,
		// game_password: null,
		// game_max_slots: 8,
		// game_weapons: {},
		// game_mode: 0,
		// game_map: 0,
		in_game: false,
		in_staging: false,
		inventory: {},
		x: 0,
		y: 0,
		z: 0,
		yaw: 0,
		pitch: 0
	};
	this.in_game = false;
	this.in_staging = false;
	this.stats = {
		rank: 0,
		total_kills: 0,
		total_games_won: 0,
		total_games_lost: 0,
		total_games_quit: 0,
		total_team_pick_red: 0,
		total_team_pick_blue: 0,
		total_nodes_captured: 0,
		kills_with: {
			wrench: 0,
			n60_storm: 0,
			blitz_gun: 0,
			gravity_bomb: 0,
			minirocket_tube: 0,
			lava_gun: 0,
			flux_rifle: 0,
			morph_o_ray: 0,
			mine_glove: 0
		}
	};


	this.start = function() {

	}

	// Send raw bytes to client
	this.send_data = function(data) {
		network.send_data(this, data);
	}

	// Send packet to client
	this.send = function(...arguments) {
		var to_send = '%xt%' + arguments.join('%') + '%';

		this.send_data(to_send);
	}

	this.addItem = function(itemId, cost = 0, showClient = true) {
		if (isNaN(itemId)) {
			return;
		}

		this.inventory.push(itemId);

		if (cost > 0) {
			this.subtractCoins(cost);
		}

		this.database.update_column(this.id, 'inventory', this.inventory.join('%'));

		if (showClient) {
			this.send('ai', this.room.internal_id, itemId, this.coins);
		}
	}

	this.removeItem = function(itemId) {
		if (isNaN(itemId)) {
			return;
		}

		var newInventory = [];

		// iterate through all the items and remove the requested itemId
		for (var i=0; i<this.inventory.length; i++) {
			if (this.inventory[i] != itemId) {
				newInventory[i] = this.inventory[i];
			}
		}

		// Set the old inventory to the new inventory
		this.inventory = newInventory;

		this.database.update_column(this.id, 'inventory', this.inventory.join('%'));
	}

	this.updateColor = function(itemId) {
		if (this.inventory.indexOf(itemId) == -1 && Number(itemId) !== 0) {
			return;
		}

		var type = global.items[itemId][3];

		if (type !== 1) {
			return;
		}

		this.color = itemId;

		this.room.send(this, 'upc', this.room.internal_id, this.id, itemId);

		this.database.update_column(this.id, 'color', itemId);
	}

	this.loadPlayer = function(callback) {
		let clothing = ['color', 'head', 'face', 'neck', 'body', 'hand', 'feet', 'photo', 'flag'];
		let player = ['id', 'username', 'inventory', 'coins', 'stamps', 'created', 'is_approved', 'stripes', 'safe_chat', 'voted', 'is_member', 'permission'];
		let agent = ['epf', 'epf_field_status'];
		let lists = ['ignores', 'buddies'];
		let igloo = ['igloos_owned', 'furniture_owned'];
		let ninja = ['card_jitsu_cards', 'card_jitsu_belt', 'card_jitsu_percentage'];

		let columnsArray = clothing.concat(player, agent, lists, igloo, ninja);

		this.database.get_columns(this.id, columnsArray, (function(row) {
			this.id = Number(row['id']);
			this.username = row['username'];
			this.inventory = row['inventory'].split('%');
			this.igloos = row['igloos_owned'].split(',');
			this.buddies = row['buddies'].split(',');
			this.color = Number(row['color']);
			this.head = Number(row['head']);
			this.face = Number(row['face']);
			this.neck = Number(row['neck']);
			this.body = Number(row['body']);
			this.hand = Number(row['hand']);
			this.feet = Number(row['feet']);
			this.photo = Number(row['photo']);
			this.flag = Number(row['flag']);
			this.coins = Number(row['coins']);
			this.stamps = row['stamps'].split(',');
			this.approved = Boolean(row['is_approved']);
			this.cards = row['card_jitsu_cards'].split('%');
			this.belt = Number(row['card_jitsu_belt']);
			this.ninja = Number(row['card_jitsu_percentage']);
			this.chat = Number(row['safe_chat']);
			this.hasVoted = Number(row['voted']);

			this.member = Boolean(row['is_member']);
			this.permission = Number(row['permission']);

			[this.EPF['status'], this.EPF['points'], this.EPF['career']] = row['epf'].split(',');
			this.EPF['field'] = row['epf_field_status'];

			var now = Math.floor(new Date() / 1000);

			this.age = Math.round((now - row['created']) / 86400);

			// Stripes 0 = No special ranks
			// Stripes 1 = No special ranks
			// Stripes 2 = One Blue Stripe
			// Stripes 3 = One Blue Stripe, One Orange Stripe
			// Stripes 4 = One Blue Stripe, One Orange Stripe, One White Stripe
			// Stripes 6 = One Blue Stripe, One Orange Stripe, One White Stripe, and a Star
			this.rank = 146 * Number(row['stripes']);

			let furnitureList = row['furniture_owned'].split(',');

			if (furnitureList.length > 0) {
				Promise.each(furnitureList, (furnitureDetails) => {
					furnitureDetails = furnitureDetails.split('|');

					var furnitureId = Number(furnitureDetails[0]);
					var quantity = Number(furnitureDetails[1]);

					this.furniture[furnitureId] = quantity;
				});
			}

			let ignoreList = row['ignores'].split(',');

			if (ignoreList.length > 0) {
				Promise.each(ignoreList, (ignoreDetails) => {
					ignoreDetails = ignoreDetails.split(':');

					var playerId = Number(ignoreDetails[0]);
					var playerUsername = String(ignoreDetails[1]);

					this.ignores[playerId] = playerUsername;
					this.ignoresById[playerId] = ignoreDetails;
				});
			}

			if (this.cards.length > 0) {
				Promise.each(this.cards, (cardString) => {
					var cardArray = cardString.split('|');
					var cardId = Number(cardArray[1]);

					this.ownedCards.push(cardId);
					this.cardsById[cardId] = cardString;
				});
			}

			/* remove belt progress */
			let beltItems = [4025, 4026, 4027, 4028, 4029, 4030, 4031, 4032, 4033, 104];

			if (this.belt == 0 && this.ninja == 0) {
				this.ninja = 0;
				this.database.update_column(this.id, 'card_jitsu_percentage', this.ninja);

				for (var index in beltItems) {
					var beltItem = beltItems[index];

					var _ind = this.inventory.indexOf(String(beltItem));

					if(_ind >= 0) {
						this.inventory.splice(_ind, 1);
					}
				}

				this.database.update_column(this.id, 'inventory', this.inventory.join('%'));
			}

			return callback();
		}).bind(this));
	}

	this.getPlayerDetails = function() {
		return null;
	}
}

module.exports = Player;

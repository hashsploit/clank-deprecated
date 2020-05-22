var logger = require('../logger.js');
var EventEmitter = require('events');

require('./post.js');

/* Discord Webhook Service */

DiscordEvent = new EventEmitter();

// Load webhooks from discord_webhooks in config.json
for (let name in global.config.discord_webhooks) {
	let url = global.config.discord_webhooks[name];

	if (!url) {
		continue;
	}

	DiscordEvent.on(name, (array) => {
		let message = [];
		let fields = [];
		let thumbnail = null;

		for (var key in array) {

			// Meta-options
			if (key.startsWith("_")) {
				var k = key.substr(1);
				var v = array[key];
				fields.push({"name": k, "value": v, "inline": true});
				continue;
			}
			if (key === "Icon") {
				var statuses = {
					"green": "https://uyaonline.com/assets/img/green.png",
					"yellow": "https://uyaonline.com/assets/img/yellow.png",
					"red": "https://uyaonline.com/assets/img/red.png",
					"hovership": "https://uyaonline.com/assets/img/hovership_scaled.png",
					"turboslider": "https://uyaonline.com/assets/img/turboslider_scaled.png",
					"hovership": "https://uyaonline.com/assets/img/hovership_scaled.png",

					"map_bakisi_isles": "https://uyaonline.com/assets/img/maps/bakisi_isles_map.png",
					"map_blackwater_city": "https://uyaonline.com/assets/img/maps/blackwater_city_map.png",
					"map_hoven_gorge": "https://uyaonline.com/assets/img/maps/hoven_gorge_map.png",
					"map_korgon_outpost": "https://uyaonline.com/assets/img/maps/korgon_outpost_map.png",
					"map_metropolis": "https://uyaonline.com/assets/img/maps/metropolis_map.png",
					"map_outpost_x12": "https://uyaonline.com/assets/img/maps/outpost_x12_map.png"
				};
				var v = array[key];
				for (var k in statuses) {
					if (k === v) {
						thumbnail = statuses[k];
					}
				}
				continue;
			}

			var value = array[key];
			var string = "**" + key + ":** " + value + "";
			message.push(string);
		}

		var dataToSend = {
			"embeds": [
				{
					"author": {
						"name": "{0}".format(global.serverModes[global.config.mode]),
						"url": null,
						"icon_url": "https://uyaonline.com/favicon.png"
					},
					"title": "**Event:** " + name,
					"description": message.join("\n"),
					"color": 16750848,
					"thumbnail": {
						"url": thumbnail
					},
					"footer": {
						"text": global.name.capitalize() + " v" + global.version,
						"icon_url": "https://uyaonline.com/favicon.png"
					},
					"fields": fields
				}
			]
		};

		HTTPEvent.emit('PostRequest', url, dataToSend);
	});
}

module.exports.DiscordEvent = DiscordEvent;

var logger = require('../../util/logger.js');
var network = require('../../util/network.js');

require('./mail.js')();

/* Pet - p# */
module.exports = function() {
	this.treatTypes = [1, 2];
	this.puffles = {};

	this.startDependency = function() {
	}

	this.joinPuffleData = function(puffleData, iglooAppend=false) {
		let puffleArray = [];

		for (let index in puffleData) {
			let puffle = puffleData[index];
			let puffleId = puffle['id'];
			let puffleDetails = [puffle['id'], puffle['name'], puffle['type'], puffle['food'], puffle['play'], puffle['rest']];

			if (iglooAppend) {
				if (puffles[puffleId] == undefined) {
					let puffleObject = global.puffles[puffle['type']];

					if (puffleObject == undefined) {
						return;
					}

					puffles[puffleId] = [puffleObject[3], puffleObject[4], puffleObject[5], 0, 0, 0, 0];
				}

				puffleDetails = puffleDetails.concat(puffles[puffleId]);
			}

			puffleArray.push(puffleDetails.join('|'));
		}

		return puffleArray.join('%');
	}

	this.getPuffles = function(penguin, data) {
		penguin.database.getPlayerPuffles(penguin.id, function(result) {

			if (result.length == 0) {
				penguin.send('pg', -1);
			}

			let puffleData = joinPuffleData(result, true);

			penguin.send('pgu', -1, puffleData);
		});
	}

	this.getPufflesByPlayerId = function(penguin, data) {
		var playerId = data[0];

		if (isNaN(playerId)) {
			network.removePenguin(penguin);
			return;
		}

		penguin.database.playerIdExists(playerId, function(result) {
			if (!result) {
				network.removePenguin(penguin);
				return;
			}

				penguin.database.getPlayerPuffles(playerId, function(result) {
					if (result.length == 0) {
						penguin.send('pg', penguin.room.internal_id);
					}

					var puffleData = joinPuffleData(result, true);

					penguin.send('pg', penguin.room.internal_id, puffleData);
				});
			});
	}

	this.updatePuffleFood = function(penguin, puffleId, value) {
		if (isNaN(puffleId) || isNaN(value)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.updatePuffleColumn(puffleId, 'food', value);
		});
	}

	this.updatePuffleRest = function(penguin, puffleId, value) {
		if (isNaN(puffleId) || isNaN(value)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.updatePuffleColumn(puffleId, 'rest', value);
		});
	}

	this.updatePufflePlay = function(penguin, puffleId, value) {
		if (isNaN(puffleId) || isNaN(value)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.updatePuffleColumn(puffleId, 'play', value);
		});
	}

	this.updatePuffleWalk = function(penguin, puffleId, value) {
		if (isNaN(puffleId) || isNaN(value)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.updatePuffleColumn(puffleId, 'is_walking', value);
		});
	}

	this.sendPuffleRest = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['rest'] += 20;
				updatePuffleRest(penguin, puffleId, result['rest']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pr', penguin.room.internal_id, puffle);
			});
		});
	}

	this.sendPufflePlay = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['play'] += 20;
				updatePufflePlay(penguin, puffleId, result['play']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pp', penguin.room.internal_id, puffle, 1);
			});
		});
	}

	this.sendPuffleTreat = function(penguin, data) {
		var puffleId = data[0];
		var treatType = data[1];

		if (isNaN(puffleId) || isNaN(treatType)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			if (treatTypes.indexOf(Number(treatType)) == -1) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['food'] += 10;
				updatePuffleFood(penguin, puffleId, result['food']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pt', penguin.room.internal_id, penguin.coins, puffle, treatType);
			});
		});
	}

	this.sendPuffleFeed = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['food'] += 20;
				updatePuffleFood(penguin, puffleId, result['food']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pf', penguin.room.internal_id, penguin.coins, puffle);
			});
		});
	}

	this.sendPuffleBath = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['play'] += 20;

				if (result['rest'] > 5) {
					result['rest'] -= 5;
				}

				updatePuffleFood(penguin, puffleId, result['play']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pb', penguin.room.internal_id, penguin.coins, puffle);
			});
		});
	}

	this.sendPuffleInteractionRest = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'ir', penguin.room.internal_id, puffle);
			});
		});
	}

	this.sendPuffleInteractionPlay = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'ip', penguin.room.internal_id, puffle);
			});
		});
	}

	this.sendPuffleInteractionFeed = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'if', penguin.room.internal_id, puffle);
			});
		});
	}

	this.sendPuffleInitInteractionRest = function(penguin, data) {
		var puffleId = data[0];
		var puffleX = data[1];
		var puffleY = data[2];

		if (isNaN(puffleId) || isNaN(puffleX) || isNaN(puffleY)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['rest'] += 20;
				updatePuffleRest(penguin, puffleId, result['rest']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pir', penguin.room.internal_id, puffleId, puffleX, puffleY);
			});
		});
	}

	this.sendPuffleInitInteractionPlay = function(penguin, data) {
		var puffleId = data[0];
		var puffleX = data[1];
		var puffleY = data[2];

		if (isNaN(puffleId) || isNaN(puffleX) || isNaN(puffleY)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				penguin.subtractCoins(5);

				result['play'] += 20;
				updatePufflePlay(penguin, puffleId, result['play']);

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pip', penguin.room.internal_id, puffleId, puffleX, puffleY);
			});
		});
	}

	this.sendPuffleMove = function(penguin, data) {
		var puffleId = data[0];
		var puffleX = data[1];
		var puffleY = data[2];

		if (isNaN(puffleId) || isNaN(puffleX) || isNaN(puffleY)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);

				if (puffles[puffleId] == undefined) {
					return;
				}

				[maxHealth, maxHunger, maxRest, x, y, unknown, walking] = puffles[puffleId];
				x = puffleX;
				y = puffleY;
				puffles[puffleId] = [maxHealth, maxHunger, maxRest, x, y, unknown, walking];

				puffle = joinPuffleData([result], true);

				penguin.room.send(penguin, 'pm', penguin.room.internal_id, puffleId, puffleX, puffleY);
			});
		});
	}

	this.sendPuffleFrame = function(penguin, data) {
		var puffleId = data[0];
		var puffleFrame = data[1];

		if (isNaN(puffleId) || isNaN(puffleFrame)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.room.send(penguin, 'ps', penguin.room.internal_id, puffleId, puffleFrame);
		});
	}

	this.sendPuffleWalk = function(penguin, data) {
		var puffleId = data[0];

		if (isNaN(puffleId)) {
			return;
		}

		penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
			if (!result) {
				return;
			}

			penguin.database.getPlayerPuffle(puffleId, function(result) {
				var puffle = joinPuffleData([result], true);
				var puffleType = result['type'];
				// FIXME: Not modular, and this could be dangerous
				var handItem = '75' + puffleType;

				if (puffles[puffleId] == undefined) {
					return;
				}

				[maxHealth, maxHunger, maxRest, x, y, unknown, walking] = puffles[puffleId];

				if (Number(result['is_walking']) == 0) {
					walking = 1;
					penguin.walkingPuffle = puffleId;
				} else {
					walking = 0;
				}

				puffles[puffleId] = [maxHealth, maxHunger, maxRest, x, y, unknown, walking];

				penguin.database.updatePuffleColumn(puffleId, 'is_walking', walking, function() {
					var puffleData = joinPuffleData([result], true);

					penguin.room.send(penguin, 'pw', penguin.room.internal_id, penguin.id, puffleData);
				});
			});
		});
	}

	this.sendAdoptPuffle = function(penguin, data) {
		var puffleType = data[0];
		var puffleName = data[1];

		// TODO: add name filter

		if (isNaN(puffleType)) {
			return;
		}

		penguin.database.getPlayerPuffles(penguin.id, function(result) {

			if (result.length >= 20) {
				penguin.send('e', -1, global.error.PUFFLE_LIMIT_M.id);
				return;
			}

			if (penguin.coins < 800) {
				penguin.send('e', -1, global.error.NOT_ENOUGH_COINS.id);
				return;
			}

			puffleName = String(puffleName).replace(/\W/g, '');

			adoptPuffle(penguin, puffleName, puffleType, function(puffleId) {
				penguin.subtractCoins(800);

				penguin.database.playerOwnsPuffle(puffleId, penguin.id, function(result) {
					if (!result) {
						return;
					}
					penguin.database.getPlayerPuffle(puffleId, function(result) {
						var puffle = joinPuffleData([result]);

						penguin.send('pn', penguin.room.internal_id, penguin.coins, puffle);

						sendSystemMail(penguin, penguin.id, puffleName, 111);
					});
				});
			});
		});
	}

	this.adoptPuffle = function(penguin, puffleName, puffleType, callback) {
		if (isNaN(puffleType)) {
			return;
		}

		penguin.database.adoptPuffle(penguin.id, puffleName, puffleType, function(puffleId) {
			if (puffleId !== null) {
				callback(puffleId);
			}
		});
	}
}

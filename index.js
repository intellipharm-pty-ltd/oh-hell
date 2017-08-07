var BID_ACCURACY = {
	UNDERBID: 'Underbid',
	ACCURATE: 'Accurate Bid',
	OVERBID: 'Overbid'
};

var module = angular.module('OhHell', []);

// bootstrap angular into the page
angular.element(document).ready(() => {
	angular.bootstrap(document.body, [module.name], {
		strictDi: true
	});
});

class AppController {
	constructor ($scope, $timeout) {
		this.$scope = $scope;
		this.$timeout = $timeout;

		this.clearPreviousGame();

		this.settings = this.getSettings();
		this.game = this.getGame();
		this.showFullScore = false;

		$scope.$watch('App.settings', (new_val, old_val) => {
			this.saveSettings();
		}, true);

		$scope.$watch('App.game', (new_val, old_val) => {
			this.saveGame();
			this.updateStats();
		}, true);
	}

	addNewPlayer () {
		if (this.newPlayerName && this.settings.players.indexOf(this.newPlayerName) === -1) {
			this.settings.players.push(this.newPlayerName);
			this.newPlayerName = '';
		}
	}

	removePlayer (index) {
		this.settings.players.splice(index, 1);
	}

	startGame () {
		var rounds = [];

		var roundRange = this.roundRange(this.settings.cardsInFirstRound, this.settings.cardsInLastRound, this.settings.mirrorRounds);

		var deck = this.generateDeck();

		for (var i = 0; i < roundRange.length; i++) {
			rounds.push(this.generateRound(rounds, deck));
		}

		this.game = {
			settings: this.settings,
			rounds: rounds,
			deck: deck,
			isFinished: false,
			currentRound: {
				index: 0,
				started: false,
			},
		};
	}

	generateRound(rounds, deck) {
		var roundRange = this.roundRange(this.settings.cardsInFirstRound, this.settings.cardsInLastRound, this.settings.mirrorRounds);
		var roundIndex = rounds.length;
		var dealer;

		if (roundIndex === 0) {
			dealer = this.generateRandomNumber(0, this.settings.players.length - 1);
		} else {
			dealer = rounds[roundIndex - 1].dealer + 1;

			if (dealer >= this.settings.players.length) {
				dealer = 0;
			}
		}

		var cardCount = this.game && this.game.isLeaderTied ? this.getHighestCardCount() : roundRange[roundIndex];

		var round = {
			card: this.drawFromDeck(deck, roundIndex === 0 ? null : rounds[roundIndex - 1].card.suit, this.settings.allowNoTrumps),
			cardCount: cardCount,
			dealer: dealer,
			players: [],
		};

		for (var j = 0; j < this.settings.players.length; j++) {
			round.players.push({
				bid: null,
				tricks: null,
			});
		}

		return round;
	}

	getSettings () {
		var settings = localStorage.getItem('oh-hell-settings');

		try {
			settings = JSON.parse(settings);
		} catch (err) {
			settings = null;
		}

		if (!settings) {
			settings = this.getDefaultSettings();
		}

		return settings;
	}

	getDefaultSettings () {
		return {
			players: [],
		};
	}

	saveSettings () {
		localStorage.setItem('oh-hell-settings', JSON.stringify(this.settings));
	}

	getGame () {
		var game = localStorage.getItem('oh-hell-game');

		try {
			game = JSON.parse(game);
		} catch (err) {
			game = null;
		}

		return game;
	}

	saveGame () {
		localStorage.setItem('oh-hell-game', JSON.stringify(this.game));
	}

	roundRange (start, end, mirror) {
		var input = [];
		var i;

		if (start < end) {
			for (i = start; i <= end; i += 1) {
		        input.push(i);
		    }
		} else {
			for (i = start; i >= end; i -= 1) {
		        input.push(i);
		    }
		}

		if (mirror) {
			input = input.concat(this.roundRange(end, start, false));
		}

	    return input;
	}

	calculateRoundPoints (playerIndex, roundIndex) {
		var cards = this.game.rounds[roundIndex].cardCount;
		var bid = parseInt(this.game.rounds[roundIndex].players[playerIndex].bid);
		var tricks = parseInt(this.game.rounds[roundIndex].players[playerIndex].tricks);
		var successful = tricks === bid;

		if (isNaN(bid) || isNaN(tricks)) {
			return null;
		}

		var points = 0;

		// award points per trick

		if (this.game.settings.winPointsPerTrick) {
			if (successful || !this.game.settings.winPointsPerTrickIfSuccessful) {
				if (tricks === 0 && this.game.settings.winPointsPerTrickIfZero) {
					points += 0.5;
				} else {
					points += tricks;
				}
			}
		}

		// lose points per trick different

		if (this.game.settings.losePointsPerDifference) {
			points -= Math.abs(tricks - bid);
		}

		// bonus points on successful bid

		var bonusSuccessful = parseInt(this.game.settings.pointsSuccessfulBid);
		if (successful && !isNaN(bonusSuccessful) ) {
			points += bonusSuccessful;
		}

		if (successful && this.game.settings.pointsSuccessfulVariable) {
			points += cards;
		}

		if (successful && this.game.settings.pointsSuccessfulInverse) {
			points += (this.getHighestCardCount() - cards + 1);
		}

		// negative points on unsuccessful bid

		var bonusUnsuccessful = parseInt(this.game.settings.pointsUnsuccessfulBid);
		if (!successful && !isNaN(bonusUnsuccessful)) {
			points -= bonusUnsuccessful;
		}

		if (!successful && this.game.settings.pointsUnsuccessfulVariable) {
			points -= cards;
		}

		if (!successful && this.game.settings.pointsUnsuccessfulInverse) {
			points -= (this.getHighestCardCount() - cards + 1);
		}

		// blind bid

		var blindBidBonus = parseInt(this.game.settings.blindBidBonus);
		if (successful && this.game.rounds[roundIndex].players[playerIndex].blind && !isNaN(blindBidBonus)) {
			points += blindBidBonus;
		}

		if (successful && this.game.rounds[roundIndex].players[playerIndex].blind && this.game.settings.blindBidDouble) {
			points *= 2;
		}

		// set the points

		this.game.rounds[roundIndex].players[playerIndex].points = points;

		return points;
	}

	calculateTotalPoints (playerIndex, roundIndex) {
		var totalPoints = 0;

		this.game.rounds.forEach((round, i) => {
			if (roundIndex && i >= roundIndex) {
				return true;
			}

			var roundPoints = this.calculateRoundPoints(playerIndex, i);

			if (roundPoints) {
				totalPoints += roundPoints;
			}
		});

		return totalPoints;
	}

	drawFromDeck(deck, previousSuit, allowNoTrumps) {
		var index = this.generateRandomNumber(0, deck.length - 1);
		var card = deck[index];

		// if this card is already drawn then drawn a different card
		if (card.drawn) {
			return this.drawFromDeck(deck, previousSuit, allowNoTrumps);
		}

		if (allowNoTrumps && card.suit === previousSuit) {
			card.suit = 'N';
		}

		return card;
	}

	generateRandomNumber (first, last) {
		return Math.round(Math.random() * last) + first;
	}

	updateStats () {
		this.$timeout(() => {
			if (this.game && this.game.rounds) {
				this.updateBidAccuracyChart();
				this.updateBidCountChart();
				this.updateScoresChart();
			}
		});
	}

	updateBidAccuracyChart () {
		var labels = [];

		this.game.settings.players.forEach((player) => {
			labels.push(player);
		});

		var datasets = [{
			label: BID_ACCURACY.ACCURATE,
			backgroundColor: this.getAccurateBidColour(),
			stack: 1,
			data: this.game.settings.players.map((player) => {
				return 0;
			}),
		}, {
			label: BID_ACCURACY.UNDERBID,
			backgroundColor: this.getUnderbidColour(),
			stack: 1,
			data: this.game.settings.players.map((player) => {
				return 0;
			}),
		}, {
			label: BID_ACCURACY.OVERBID,
			backgroundColor: this.getOverbidColour(),
			stack: 1,
			data: this.game.settings.players.map((player) => {
				return 0;
			}),
		}];

		this.game.rounds.forEach((round, roundIndex) => {
			round.players.forEach((player, playerIndex) => {
				var bidAccuracy = this.calculatePlayerRoundBidAccuracy(playerIndex, roundIndex);

				if (bidAccuracy === BID_ACCURACY.UNDERBID) {
					datasets[1].data[playerIndex]++;
				} else if (bidAccuracy === BID_ACCURACY.ACCURATE) {
					datasets[0].data[playerIndex]++;
				} else if (bidAccuracy === BID_ACCURACY.OVERBID) {
					datasets[2].data[playerIndex]++;
				}
			});
		});

		if (this.chartBidAccuracy) {
			this.chartBidAccuracy.destroy();
		}

		this.chartBidAccuracy = new Chart(document.getElementById('chart-bid-accuracy'), {
		    type: 'bar',
		    data: {
		        labels: labels,
		        datasets: datasets
		    },
		    options: {
				legend: {
					display: false
				},
		        scales: {
		            yAxes: [{
		                ticks: {
		                    beginAtZero: true
		                }
		            }]
		        }
		    }
		});
	}

	updateBidCountChart () {
		var labels = [];
		var highestCardCount = this.getHighestCardCount();

		for (var i = 0; i <= highestCardCount; i++) {
			labels.push(i + ' Bid');
		}

		var datasets = [];

		this.game.rounds.forEach((round, roundIndex) => {
			round.players.forEach((player, playerIndex) => {
				var bid = parseInt(player.bid);

				if (!datasets[playerIndex]) {
					var data = [];
					labels.forEach((label) => {
						data.push(0);
					});

					datasets[playerIndex] = {
						label: this.game.settings.players[playerIndex],
						backgroundColor: this.getPlayerColour(playerIndex),
						borderColor: this.getPlayerColour(playerIndex),
						fill: false,
						data: data,
					}
				}

				if (!isNaN(bid)) {
					datasets[playerIndex].data[bid]++;
				}
			});
		});

		if (this.chartBidCounts) {
			this.chartBidCounts.destroy();
		}

		this.chartBidCounts = new Chart(document.getElementById('chart-bid-counts'), {
		    type: 'line',
		    data: {
		        labels: labels,
		        datasets: datasets
		    },
		    options: {
		        scales: {
		            yAxes: [{
		                ticks: {
		                    beginAtZero: true,
		                }
		            }]
		        }
		    }
		});
	}

	updateScoresChart() {
		var labels = [];

		for (var i = 1; i <= this.game.rounds.length; i++) {
			labels.push('Round ' + i);
		}

		var datasets = [];
		var threshold = parseInt(this.game.settings.blindBidThreshold);

		this.game.rounds.forEach((round, roundIndex) => {
			let roundHighestPoints = null;

			round.players.forEach((player, playerIndex) => {
				if (!datasets[playerIndex]) {
					datasets[playerIndex] = {
						label: this.game.settings.players[playerIndex],
						backgroundColor: this.getPlayerColour(playerIndex),
						borderColor: this.getPlayerColour(playerIndex),
						fill: false,
						data: [],
					}
				}

				var points = parseInt(player.points);
				if (!isNaN(points)) {
					if (roundIndex > 0) {
						points = datasets[playerIndex].data[roundIndex - 1] + points;
					}
					datasets[playerIndex].data.push(points);

					if (points > roundHighestPoints || roundHighestPoints === null) {
						roundHighestPoints = points;
					}
				}
			});

			if (!isNaN(threshold)) {
				if (!datasets[round.players.length]) {
					datasets[round.players.length] = {
						label: 'Blind Bid Threshold',
						backgroundColor: this.getBlindBidColour(),
						borderColor: this.getBlindBidColour(),
						fill: false,
						data: [],
					}
				}

				var blindBidThreshold = roundHighestPoints - threshold;
				if (blindBidThreshold < 0) {
					blindBidThreshold = roundHighestPoints === null ? null : 0;
				}

				datasets[round.players.length].data.push(blindBidThreshold)
			}
		});

		if (this.chartBidScores) {
			this.chartBidScores.destroy();
		}

		this.chartBidScores = new Chart(document.getElementById('chart-bid-scores'), {
		    type: 'line',
		    data: {
		        labels: labels,
		        datasets: datasets
		    },
		    options: {
		        scales: {
		            yAxes: [{
		                ticks: {
							beginAtZero: true,
		                }
		            }]
		        }
		    }
		});
	}

	getPlayerColour (playerIndex) {
		return [
			'#a6cee3',
			'#1f78b4',
			'#b2df8a',
			'#33a02c',
			'#fb9a99',
			'#fdbf6f',
			'#ff7f00',
			'#cab2d6',
			'#6a3d9a',
			'#ffff99',
			'#b15928'
		][playerIndex];
	}

	getUnderbidColour () {
		return '#f0ad4e';
	}

	getAccurateBidColour () {
		return '#5cb85c';
	}

	getOverbidColour () {
		return '#c9302c';
	}

	getBlindBidColour () {
		return '#e31a1c';
	}

	getColumnWidth () {
		var columnCount = this.game.settings.players.length;

		if (this.showFullScore) {
			columnCount++;
		}

		return (100 / columnCount) + '%';
	}

	toggleStoreView () {
		this.showFullScore = !this.showFullScore;
	}

	startRound () {
		this.game.currentRound.started = true;
	}

	nextRound () {
		if (this.game.currentRound.index === (this.game.rounds.length - 1)) {
			this.game.leaderboard = this.getLeaderboard();
			this.game.isLeaderTied = this.isLeaderTied(this.game.leaderboard);
			this.game.isFinished = !this.game.isLeaderTied;

			if (this.game.isLeaderTied) {
				this.game.rounds.push(this.generateRound(this.game.rounds, this.game.deck));
				this.proceedToNextRound();
			}
		} else {
			this.proceedToNextRound();
		}
	}

	proceedToNextRound() {
		this.game.currentRound.index++;
		this.game.currentRound.started = false;
	}

	eligibleForBlindBid (playerIndex, roundIndex) {
		var playerPoints = [];
		var leader = 0;

		this.game.settings.players.forEach((player, i) => {
			playerPoints[i] = this.calculateTotalPoints(i, roundIndex);

			if (playerPoints[i] >= playerPoints[leader]) {
				leader = i;
			}
		});

		var threshold = parseInt(this.game.settings.blindBidThreshold);
		var canBlindBid = !isNaN(threshold) && (playerPoints[playerIndex] + threshold) <= playerPoints[leader];

		this.game.rounds[roundIndex].players[playerIndex].canBlindBid = canBlindBid;

		return canBlindBid;
	}

	getLeaderboard() {
		var leaderboard = [];

		this.game.settings.players.forEach((player, playerIndex) => {
			leaderboard[playerIndex] = {
				player: player,
				points: this.calculateTotalPoints(playerIndex),
			};
		});

		leaderboard.sort((a, b) => {
			return b.points - a.points;
		});

		return leaderboard;
	}

	isLeaderTied(leaderboard) {
		return leaderboard[0].points === leaderboard[1].points;
	}

	calculateBidderRestriction(roundIndex) {
		var bid = this.game.rounds[roundIndex].cardCount - this.calculateTotalBids(roundIndex, this.game.rounds[roundIndex].dealer);

		if (bid < 0) {
			return 'Can bid anything';
		} else {
			return 'Cannot bid ' + bid;
		}
	}

	calculateTotalBids(roundIndex, excludeDealer) {
		var bids = 0;

		for (var i = 0; i < this.game.rounds[roundIndex].players.length; i++) {
			if (i === excludeDealer) {
				continue;
			}

			bids += this.game.rounds[roundIndex].players[i].bid;
		}

		return bids;
	}

	calculateBlindBidsDescription (roundIndex, excludeDealer) {
		var bids = this.calculateBlindBids(roundIndex, excludeDealer);

		if (bids === 0) {
			return 'There are no blind bids';
		} else if (bids === 1) {
			return 'There is 1 blind bid';
		} else {
			return 'There are ' + bids + ' blind bids';
		}
	}

	calculateBlindBids (roundIndex, excludeDealer) {
		var bids = 0;

		for (var i = 0; i < this.game.rounds[roundIndex].players.length; i++) {
			if (i === excludeDealer) {
				continue;
			}

			if (this.game.rounds[roundIndex].players[i].blind) {
				bids++;
			}
		}

		return bids;
	}

	calculateAccurateBidCount (playerIndex, roundIndex) {
		var accurateBids = 0;

		for (var i = 0; i < roundIndex; i++) {
			let bidAccuracy = this.calculatePlayerRoundBidAccuracy(playerIndex, i);

			if (bidAccuracy === BID_ACCURACY.ACCURATE) {
				accurateBids++;
			}
		}

		return accurateBids;
	}

	calculateBidAccuracy (playerIndex, roundIndex) {
		return Math.round(this.calculateAccurateBidCount(playerIndex, roundIndex) / roundIndex * 100);
	}

	calculatePlayerRoundBidAccuracy (playerIndex, roundIndex) {
		var tricks = parseInt(this.game.rounds[roundIndex].players[playerIndex].tricks);
		var bid = parseInt(this.game.rounds[roundIndex].players[playerIndex].bid);

		if (isNaN(tricks) || isNaN(bid)) {
			return null;
		}

		if (tricks > bid) {
			return BID_ACCURACY.UNDERBID;
		}

		if (tricks === bid) {
			return BID_ACCURACY.ACCURATE;
		}

		if (tricks < bid) {
			return BID_ACCURACY.OVERBID;
		}

		return null;
	}

	getHighestCardCount() {
		return Math.max(this.game.settings.cardsInFirstRound, this.game.settings.cardsInLastRound);
	}

	clearPreviousGame() {
		if (confirm('Clear Local Storage?')) {
			window.localStorage.clear();
		}
	}

	generateDeck() {
		var names = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
		var suits = ['H', 'D', 'S', 'C'];
		var deck = [];

	    for (var s = 0; s < suits.length; s++) {
        for (var n = 0; n < names.length; n++) {
          deck.push({
						name: names[n],
						suit: suits[s]
					});
        }
	    }

	    return deck;
	}
}

AppController.$inject = ['$scope', '$timeout'];

module.controller('AppController', AppController);

var cardComponent = {
	bindings: {
		suit: '<',
		name: '<',
		size: '@',
	},
	template: `<div class="card card-suit-{{card.suit}} card-size-{{card.size}}">
			<div class="card-name">
				{{card.name}}
			</div>
			<span class="card-suit" ng-switch="card.suit">
				<span ng-switch-when="S" style="color: #000000;">&spades;</span>
				<span ng-switch-when="C" style="color: #000000;">&clubs;</span>
				<span ng-switch-when="D" style="color: #FC0000;">&diams;</span>
				<span ng-switch-when="H" style="color: #FC0000;">&hearts;</span>
				<span ng-switch-when="N">
					<!-- &#127183; -->
					<img src="http://www.peacemonger.org/assets/images/CS155-X.jpg" height="185px" alt="No Trumps" />
				</span>
			</span>
	</div>`,
	controller: function() {},
	controllerAs: 'card'
};

module.component('card', cardComponent);

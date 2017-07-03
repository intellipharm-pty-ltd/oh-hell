window.localStorage.clear();

var module = angular.module('OhHell', []);

// bootstrap angular into the page
angular.element(document).ready(() => {
	angular.bootstrap(document.body, [module.name], {
		strictDi: true
	});
});

class AppController {
	constructor ($scope) {
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
		
		this.updateStats();
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
		var dealer = this.generateRandomNumber(0, this.settings.players.length - 1);
		
		for (var i = 0; i < roundRange.length; i++) {
			if (i > 0) {
				dealer++;
				
				if (dealer >= this.settings.players.length) {
					dealer = 0;
				}
			}
			
			var round = {
				suit: this.generateRandomSuit(i === 0 ? null : rounds[i - 1].suit),
				cards: roundRange[i],
				dealer: dealer,
				players: [],
			};
			
			for (var j = 0; j < this.settings.players.length; j++) {
				round.players.push({
					bid: null,
					tricks: null,
				});
			}
			rounds.push(round);
		}
		
		this.game = {
			settings: this.settings,
			rounds: rounds,
			isFinished: false,
			currentRound: {
				index: 0,
				started: false,
			},
		};
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
		
		if (start < end) {
			for (var i = start; i <= end; i += 1) {
		        input.push(i);
		    }
		} else {
			for (var i = start; i >= end; i -= 1) {
		        input.push(i);
		    }
		}
		
		if (mirror) {
			input = input.concat(this.roundRange(end, start, false));
		}
		
	    return input;
	}
	
	calculateRoundPoints (playerIndex, roundIndex) {
		var cards = this.game.rounds[roundIndex].cards;
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
	
	generateRandomSuit (previousSuit) {
		var suits = ['S', 'C', 'D', 'H'];
		var index = this.generateRandomNumber(0, 3);
		
		if (suits[index] === previousSuit) {
			return 'N';
		}
		
		return suits[index];
	}
	
	generateRandomNumber (first, last) {
		return Math.round(Math.random() * last) + first;
	}
	
	updateStats () {
		if (this.game && this.game.rounds) {
			this.updateBidAccuracyChart();
			this.updateBidCountChart();
			this.updateScoresChart();
		}
	}
	
	updateBidAccuracyChart () {
		var labels = [];
		
		this.game.settings.players.forEach((player) => {
			labels.push(player);
		});
		
		var datasets = [{
			label: 'Accurate Bid',
			backgroundColor: '#5cb85c',
			stack: 1,
			data: this.game.settings.players.map((player) => {
				return 0;
			}),
		}, {
			label: 'Underbid',
			backgroundColor: '#f0ad4e',
			stack: 1,
			data: this.game.settings.players.map((player) => {
				return 0;
			}),
		}, {
			label: 'Overbid',
			backgroundColor: '#c9302c',
			stack: 1,
			data: this.game.settings.players.map((player) => {
				return 0;
			}),
		}];
		
		this.game.rounds.forEach((round, roundIndex) => {
			round.players.forEach((player, playerIndex) => {
				var tricks = parseInt(player.tricks);
				var bid = parseInt(player.bid);
				
				if (!isNaN(tricks) && !isNaN(bid)) {
					if (tricks > bid) {
						datasets[1].data[playerIndex]++;
					} else if (tricks === bid) {
						datasets[0].data[playerIndex]++;
					} else if (tricks < bid) {
						datasets[2].data[playerIndex]++;
					}
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
				var tricks = parseInt(player.tricks);
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
		console.log(labels);
		var datasets = [];
		
		this.game.rounds.forEach((round, roundIndex) => {
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
					if (roundIndex === 0) {
						datasets[playerIndex].data.push(points);
					} else {
						datasets[playerIndex].data.push(datasets[playerIndex].data[roundIndex - 1] + points);
					}
				}
			});
		});
		
		if (this.chartBidScores) {
			this.chartBidScores.destroy();
		}
		console.log(this.game.rounds.length);
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
            '#EE2E2F',
            '#F47D23',
            '#008C48',
            '#185AA9',
            '#662C91',
            '#E76BC7',
        ][playerIndex];
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
			this.game.isFinished = true;
		} else {
			this.game.currentRound.index++;
			this.game.currentRound.started = false;
		}
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
	
	calculateBidderRestriction(roundIndex) {
		let bid = this.game.rounds[roundIndex].cards - this.calculateTotalBids(roundIndex, this.game.rounds[roundIndex].dealer);
		
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
	
	getHighestCardCount() {
		return Math.max(this.game.settings.cardsInFirstRound, this.game.settings.cardsInLastRound);
	}
}

AppController.$inject = ['$scope'];

module.controller('AppController', AppController);
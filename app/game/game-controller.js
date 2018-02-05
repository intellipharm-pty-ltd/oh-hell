import { GameService } from '../services/game.js';
import { ChartService } from '../services/chart.js';
import { StorageService } from '../services/storage.js';

export class GameController {
  constructor($scope, $timeout, $route, $location) {
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.$route = $route;
    this.$location = $location;

    this.gameService = new GameService();
    this.chartService = new ChartService();
    this.storageService = new StorageService();

    this.getSettings().then((settings) => {
      this.settings = settings;

      $scope.$watch('Game.settings', (new_val, old_val) => {
        this.saveSettings();
      }, true);
      $scope.$apply();
    });

    this.getGame(_.parseInt($route.current.params.id)).then((game) => {
      this.game = game;

      $scope.$watch('Game.game', (new_val, old_val) => {
        this.saveGame(this.game);
        this.updateStats();
      }, true);
      $scope.$apply();
    });
  }

  addNewPlayer() {
    if (this.newPlayerName && this.settings.players.indexOf(this.newPlayerName) === -1) {
      this.settings.players.push(this.newPlayerName);
      this.newPlayerName = '';
    }
  }

  movePlayerUp(index) {
    if (index === 0) {
      return false;
    }

    this.settings.players.splice(index - 1, 0, this.settings.players.splice(index, 1)[0]);
  }

  movePlayerDown(index) {
    if (index === this.settings.players.length - 1) {
      return false;
    }

    this.settings.players.splice(index + 1, 0, this.settings.players.splice(index, 1)[0]);
  }

  removePlayer(index) {
    this.settings.players.splice(index, 1);
  }

  startGame() {
    var rounds = [];

    var roundRange = this.roundRange(this.settings.cardsInFirstRound, this.settings.cardsInLastRound, this.settings.mirrorRounds);

    var deck = this.generateDeck();

    for (var i = 0; i < roundRange.length; i++) {
      rounds.push(this.generateRound(rounds, deck));
    }

    var game = {
      id: new Date().getTime(),
      startTime: new Date(),
      settings: this.settings,
      rounds: rounds,
      deck: deck,
      isFinished: false,
      currentRound: {
        index: 0,
        started: false,
      },
    };

    this.saveGame(game).then(() => {
      var path = `/game/${game.id}`;

      console.log('Game started - redirecting to ' + path);
      this.$location.path(path);
      this.$scope.$apply();
    });
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

    var cardCount = this.game && this.game.isLeaderTied ? this.gameService.getHighestCardCount(this.game) : roundRange[roundIndex];

    var round = {
      card: this.drawCardFromDeck(deck, roundIndex === 0 ? null : rounds[roundIndex - 1].card.suit, this.settings.allowNoTrumps),
      cardCount: cardCount,
      dealer: dealer,
      players: [],
      order: [],
    };

    for (var j = 0; j < this.settings.players.length; j++) {
      round.players.push({
        bid: null,
        tricks: null,
      });
    }

    for (var k = dealer + 1; round.order.length < this.settings.players.length; k++) {
      if (k >= this.settings.players.length) {
        k = 0;
      }

      round.order.push(k);
    }

    return round;
  }

  canStartRound() {
    var allPlayersHaveBid = true;

    // check to make sure all players have bid
    this.game.rounds[this.game.currentRound.index].players.forEach((player) => {
      if (player.bid === null) {
        allPlayersHaveBid = false;
      }
    });

    if (!allPlayersHaveBid) {
      return allPlayersHaveBid;
    }

    // check to make sure the dealer has not bid incorrectly
    var bid = this.calculateDealerBidRestriction(this.game.currentRound.index);
    var dealer = this.game.rounds[this.game.currentRound.index].dealer;

    if (this.game.rounds[this.game.currentRound.index].players[dealer].bid === bid) {
      return false;
    }

    return true;
  }

  canProgressToNextRound() {
    var allPlayersHaveScored = true;

    // check to make sure all players have scored
    this.game.rounds[this.game.currentRound.index].players.forEach((player) => {
      if (player.tricks === null) {
        allPlayersHaveScored = false;
      }
    });

    return allPlayersHaveScored;
  }

  bidIsDisabled(orderIndex, playerIndex) {
    // if this is the first player in the round then allow the bid
    if (orderIndex === 0) {
      return false;
    }

    var round = this.game.rounds[this.game.currentRound.index];

    for (var i = 0; i < round.order.length && i < orderIndex; i++) {
      // if any player before this player hasn't bid yet then disable the bid
      if (round.players[round.order[i]].bid === null) {
        return true;
      }
    }

    return false;
  }

  hasDealerBidIllegally(playerIndex) {
    var round = this.game.rounds[this.game.currentRound.index];

    if (playerIndex !== round.dealer) {
      return false;
    }

    var bid = this.calculateDealerBidRestriction(this.game.currentRound.index);

    if (bid < 0) {
      return false;
    } else {
      var bid = this.calculateDealerBidRestriction(this.game.currentRound.index);

      if (this.game.rounds[this.game.currentRound.index].players[playerIndex].bid === bid) {
        return true;
      }
    }

    return false;
  }

  getSettings() {
    return new Promise((resolve, reject) => {
      this.storageService.getSettings().then((settings) => {
        if (!settings) {
          settings = this.getDefaultSettings();
        }

        resolve(settings);
      }, () => {
        resolve(null);
      });
    });
  }

  getDefaultSettings() {
    return {
      players: [],
    };
  }

  saveSettings() {
    this.storageService.saveSettings(this.settings);
  }

  getGame(id) {
    return new Promise((resolve, reject) => {
      if (id === 0) {
        return resolve(null);
      }

      if (id) {
        this.storageService.findGameById(id).then((game) => {
          console.log('Game loaded', id, game);
          resolve(game);
        }, (error) => {
          console.log('Game not loaded', id, error);
          resolve(null);
        });
      } else {
        this.storageService.getLatestGame().then((game) => {
          resolve(game);
        }, () => {
          resolve(null);
        });
      }
    });
  }

  saveGame(game) {
    return this.storageService.saveGame(game).then(() => {
      console.log('Game saved successfully', game);
    }, (error) => {
      console.warn('Game not saved', game, error);
    });
  }

  roundRange(start, end, mirror) {
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




  drawCardFromDeck(deck, previousSuit, allowNoTrumps) {
    var index = this.generateRandomNumber(0, deck.length - 1);
    var card = Object.assign({}, deck[index]);

    // if this card is already drawn then drawn a different card
    if (card.drawn) {
      return this.drawCardFromDeck(deck, previousSuit, allowNoTrumps);
    }

    if (allowNoTrumps && card.suit === previousSuit) {
      card.suit = 'N';
    }

    card.drawn = true;

    return card;
  }

  generateRandomNumber(first, last) {
    return Math.round(Math.random() * last) + first;
  }

  updateStats() {
    this.$timeout(() => {
      if (this.game && this.game.rounds) {
        this.chartService.displayBidAccuracyChart([this.game], false, true);
        this.chartService.displayBidCountChart([this.game], false, true);
        this.chartService.displayScoresChart([this.game], false, true);
      }
    });
  }

  createNewGame() {
    this.game = null;
  }

  startRound() {
    this.game.currentRound.started = true;
  }

  nextRound() {
    if (this.game.currentRound.index === (this.game.rounds.length - 1)) {
      this.game.leaderboard = this.gameService.getLeaderboard(this.game);
      this.game.isLeaderTied = this.isLeaderTied(this.game.leaderboard);
      this.game.isFinished = !this.game.isLeaderTied;

      if (this.game.isLeaderTied) {
        this.game.rounds.push(this.generateRound(this.game.rounds, this.game.deck));
        this.proceedToNextRound();
      } else {
        this.game.endTime = new Date();
      }
    } else {
      this.proceedToNextRound();
    }
  }

  proceedToNextRound() {
    this.game.currentRound.index++;
    this.game.currentRound.started = false;
  }

  eligibleForBlindBid(playerIndex, roundIndex) {
    var playerPoints = [];
    var leader = 0;

    this.game.settings.players.forEach((player, i) => {
      playerPoints[i] = this.gameService.calculateTotalPoints(this.game, i, roundIndex);

      if (playerPoints[i] >= playerPoints[leader]) {
        leader = i;
      }
    });

    var threshold = parseInt(this.game.settings.blindBidThreshold);
    var canBlindBid = !isNaN(threshold) && (playerPoints[playerIndex] + threshold) <= playerPoints[leader];

    this.game.rounds[roundIndex].players[playerIndex].canBlindBid = canBlindBid;

    return canBlindBid;
  }



  isLeaderTied(leaderboard) {
    return leaderboard[0].points === leaderboard[1].points;
  }

  calculateBidderRestriction(roundIndex) {
    var bid = this.calculateDealerBidRestriction(roundIndex);

    if (bid < 0) {
      return 'Can bid anything';
    } else {
      return 'Cannot bid ' + bid;
    }
  }

  calculateDealerBidRestriction(roundIndex) {
    return this.game.rounds[roundIndex].cardCount - this.calculateTotalBids(roundIndex, this.game.rounds[roundIndex].dealer);
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

  calculateBlindBidsDescription(roundIndex, excludeDealer) {
    var bids = this.calculateBlindBids(roundIndex, excludeDealer);

    if (bids === 0) {
      return 'There are no blind bids';
    } else if (bids === 1) {
      return 'There is 1 blind bid';
    } else {
      return 'There are ' + bids + ' blind bids';
    }
  }

  calculateBlindBids(roundIndex, excludeDealer) {
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

GameController.$inject = ['$scope', '$timeout', '$route', '$location'];

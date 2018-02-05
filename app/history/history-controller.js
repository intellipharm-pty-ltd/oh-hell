import { GameService } from '../services/game.js';
import { ChartService } from '../services/chart.js';
import { StorageService } from '../services/storage.js';

export class HistoryController {
  constructor($scope, $timeout) {
    this.$scope = $scope;
    this.$timeout = $timeout;

    this.gameService = new GameService();
    this.chartService = new ChartService();
    this.storageService = new StorageService();

    this.lowestScore = {player: [], points: 100, days: [], numplayers: []};
    this.highestScore = {player: [], points: 0, days: [], numplayers: []};
    this.loseStreak = {player: [], points: 0, days: 0, numplayers: '-'};
    this.tmpwinStreak = {player: "", points: 0, days: 0, numplayers: '-'};
    this.winStreak = {player: [], points: 0, days: 0, numplayers: '-'};

    this.loadGames();
  }

  loadGames() {
    this.storageService.getAllGames().then((games) => {
      // game stats
      this.games = _.map(games, (game) => {
        game.leaderboard = this.gameService.getLeaderboard(game);
        game.bruceScoring = this.gameService.calculateBruceScoring(game);
        return game;
      });

      // individual player stats
      this.stats = [];
      this.ratings = [];

      _.forEach(games, (game, gameIndex) => {
          var blnGameDone = false;
        _.forEach(game.settings.players, (player, playerIndex) => {
          var statIndex = this.findPlayerStats(player);
          var leaderboardIndex = _.findIndex(game.leaderboard, {player: player});

          if (statIndex === -1) {
            this.stats.push({
              player: player,
              games: 0,
              rounds: 0,
              roundsWon: 0,
              wins: 0,
              blindBids: 0,
              blindBidsWon: 0,
              points: 0,
              gamesSinceWin: 0,
              loseStreak: 0,
            });
            this.ratings.push({
              player: player,
              games: 0,
              scoring321: 0,
              bruce: 0,
            });
            statIndex = this.stats.length - 1;
          }

          this.stats[statIndex].games++;
          this.ratings[statIndex].games++;
          this.stats[statIndex].rounds += game.rounds.length;
          this.stats[statIndex].points += game.leaderboard[leaderboardIndex].points;
          this.ratings[statIndex].scoring321 += game.isFinished && leaderboardIndex < 3 ? 3 - leaderboardIndex : 0;
          this.ratings[statIndex].bruce += game.isFinished ? game.bruceScoring.find((x) => { return x.player === player; }).points : 0;

          if (!this.stats[statIndex].hasOwnProperty('maxPoints') || game.leaderboard[leaderboardIndex].points > this.stats[statIndex].maxPoints) {
            this.stats[statIndex].maxPoints = game.leaderboard[leaderboardIndex].points;
          }

          if (!this.stats[statIndex].hasOwnProperty('minPoints') || game.leaderboard[leaderboardIndex].points < this.stats[statIndex].minPoints) {
            this.stats[statIndex].minPoints = game.leaderboard[leaderboardIndex].points;
          }

          if (game.leaderboard[0].player == game.settings.players[playerIndex]) {
            this.stats[statIndex].gamesSinceWin = 0;
          } else {
            this.stats[statIndex].gamesSinceWin++;
            if (this.stats[statIndex].gamesSinceWin >= this.loseStreak.points) {
                this.stats[statIndex].gamesSinceWin > this.loseStreak.points ? this.loseStreak.player = [] : null;
                this.loseStreak.points = this.stats[statIndex].gamesSinceWin;
                this.loseStreak.player.push(this.stats[statIndex].player);
                this.loseStreak.days = 0;
            } else {
              if (!blnGameDone) {
                this.loseStreak.days++
                blnGameDone = true;
              }
            }
          }
        });

        if (game.isFinished) {
          this.stats[this.findPlayerStats(game.leaderboard[0].player)].wins++;
          // calcuate winning streak
          if (game.leaderboard[0].player == this.tmpwinStreak.player) {
              this.tmpwinStreak.points++
              this.winStreak.days++
              if (this.tmpwinStreak.points >= this.winStreak.points) {
                  // this.winStreak = Object.assign({},this.tmpwinStreak);
                  this.tmpwinStreak.points > this.winStreak.points ? this.winStreak.player = [] : null;
                  this.winStreak.player.push(this.tmpwinStreak.player);
                  this.winStreak.points = this.tmpwinStreak.points;
                  this.winStreak.days = 0;
              }
          } else {
            this.winStreak.days++
            this.tmpwinStreak.player = game.leaderboard[0].player;
            this.tmpwinStreak.points = 1;
          }
        }

        _.forEach(game.rounds, (round) => {
          _.forEach(round.players, (player, playerIndex) => {
            var statIndex = this.findPlayerStats(game.settings.players[playerIndex]);

            if (player.blind) {
              this.stats[statIndex].blindBids++;
              if (player.bid === player.tricks)  {
                this.stats[statIndex].blindBidsWon++;
              }
            }

            if (player.bid === player.tricks && player.bid) {
              this.stats[statIndex].roundsWon++;
            }
          });
        });

        // calculate averages
        this.stats.forEach((stat) => {
          stat.averagePoints = stat.points / stat.games;
          stat.winPercentage = stat.wins / stat.games * 100;
          stat.roundsWonPercentage = stat.roundsWon / stat.rounds * 100;
          stat.blindBidsPercentage = stat.blindBids / stat.rounds * 100;
          stat.blindBidsWonPercentage = stat.blindBidsWon / stat.blindBids * 100;
        });

        this.ratings.forEach((rating) => {
          rating.bruceAverage = rating.bruce / rating.games;
          rating.scoring321Average = rating.scoring321 / rating.games;
        });

        // calculate records
        if (game.leaderboard[game.leaderboard.length - 1].points <= this.lowestScore.points && game.isFinished) {
            game.leaderboard[game.leaderboard.length - 1].points < this.lowestScore.points ? this.lowestScore.player = [] : null;
            game.leaderboard[game.leaderboard.length - 1].points < this.lowestScore.points ? this.lowestScore.days = [] : null;
            game.leaderboard[game.leaderboard.length - 1].points < this.lowestScore.points ? this.lowestScore.numplayers = [] : null;
            this.lowestScore.points = game.leaderboard[game.leaderboard.length - 1].points;
            this.lowestScore.player.push(game.leaderboard[game.leaderboard.length - 1].player);
            this.lowestScore.days.push(moment().diff(moment(game.endTime), 'd'));
            this.lowestScore.numplayers.push(game.settings.players.length);
        }

        if (game.leaderboard[0].points > this.highestScore.points && game.isFinished) {
            game.leaderboard[game.leaderboard.length - 1].points < this.highestScore.points ? this.highestScore.player = [] : null;
            game.leaderboard[game.leaderboard.length - 1].points < this.highestScore.points ? this.highestScore.days = [] : null;
            game.leaderboard[game.leaderboard.length - 1].points < this.highestScore.points ? this.highestScore.numplayers = [] : null;
            this.highestScore.points = game.leaderboard[0].points;
            this.highestScore.player.push(game.leaderboard[0].player);
            this.highestScore.days.push(moment().diff(moment(game.endTime), 'd'));
            this.highestScore.numplayers.push(game.settings.players.length);
        }
      });

      // create the charts
      this.loadCharts();

      this.$timeout(() => {
        this.$scope.$apply();
      });
    });
  }

  findPlayerStats(player) {
    return _.findIndex(this.stats, {player: player});
  }

  deleteGame(game) {
    this.storageService.deleteGame(game).then(() => {
      this.loadGames();
    });
  }

  loadCharts() {
    this.chartService.displayBidAccuracyChart(this.games, this.useAverage, this.useIncomplete);
    this.chartService.displayBidCountChart(this.games, this.useAverage, this.useIncomplete);
    this.chartService.displayScoresChart(this.games, this.useAverage, this.useIncomplete);
  }

  exportAllGames() {
    this.storageService.exportAllGames();
  }

  exportGame(id) {
    this.storageService.exportGame(id);
  }

  importFile() {
    this.storageService.importFile().then((count) => {
      this.loadGames();
      alert('Imported ' + count + ' new games');
    });
  }
}

HistoryController.$inject = ['$scope', '$timeout'];

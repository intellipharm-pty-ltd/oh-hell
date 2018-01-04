import { GameService } from '../services/game.js';
import { ChartService } from '../services/chart.js';
import { StorageService } from '../services/storage.js';

export class HistoryController {
  constructor($scope) {
    this.$scope = $scope;

    this.gameService = new GameService();
    this.chartService = new ChartService();
    this.storageService = new StorageService();

    this.loadGames();
  }

  loadGames() {
    this.storageService.getAllGames().then((games) => {
      // game stats
      this.games = _.map(games, (game) => {
        game.leaderboard = this.gameService.getLeaderboard(game);
        return game;
      });

      // individual player stats
      this.stats = {};
      _.forEach(games, (game) => {
        _.forEach(game.settings.players, (player) => {
          if (!this.stats.hasOwnProperty(player)) {
            this.stats[player] = {
              wins: 0,
              blindBids: 0,
            };
          }
        });

        if (game.isFinished) {
          this.stats[game.leaderboard[0].player].wins++;
        }

        _.forEach(game.rounds, (round) => {
          _.forEach(round.players, (player, playerIndex) => {
            if (player.blind) {
              this.stats[game.settings.players[playerIndex]].blindBids++;
            }
          });
        });
      });

      // create the charts
      this.loadCharts();

      this.$scope.$apply();
    });
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
}

HistoryController.$inject = ['$scope'];

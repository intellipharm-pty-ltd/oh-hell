import { GameService } from '../services/game.js';
import { ChartService } from '../services/chart.js';
import { StorageService } from '../services/storage.js';

export class HistoryController {
  constructor($scope) {
    this.$scope = $scope;

    this.gameService = new GameService();
    this.chartService = new ChartService();
    this.storageService = new StorageService();

    this.lowestScore = {player: "", points: 100, days: 0};
    this.highestScore = {player: "", points: 0, days: 0};

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
              games: 0,
              rounds: 0,
              roundsWon: 0,
              wins: 0,
              blindBids: 0,
              blindBidsWon: 0,
              points: 0,
            };
          }

          this.stats[player].games++;
          this.stats[player].rounds += game.rounds.length;
          this.stats[player].points += game.isFinished ? game.leaderboard.length - game.leaderboard.findIndex(x => x.player== player) : 0;
        });

        if (game.isFinished) {
          this.stats[game.leaderboard[0].player].wins++;
        }



        _.forEach(game.rounds, (round) => {
          _.forEach(round.players, (player, playerIndex) => {
            if (player.blind) {
              this.stats[game.settings.players[playerIndex]].blindBids++;
              if(player.bid === player.tricks){
                  this.stats[game.settings.players[playerIndex]].blindBidsWon++;
              }
            }
            if(player.bid === player.tricks){
                this.stats[game.settings.players[playerIndex]].roundsWon++;
            }
          });
        });
        if(game.leaderboard[game.leaderboard.length - 1].points < this.lowestScore.points){
            this.lowestScore.points = game.leaderboard[game.leaderboard.length - 1].points;
            this.lowestScore.player = game.leaderboard[game.leaderboard.length - 1].player;
            this.lowestScore.days = moment().diff(moment(game.endTime), 'd');
        }
        if(game.leaderboard[0].points > this.highestScore.points){
            this.highestScore.points = game.leaderboard[0].points;
            this.highestScore.player = game.leaderboard[0].player;
            this.highestScore.days = moment().diff(moment(game.endTime), 'd');
        }
      });

      // create the charts
      this.loadCharts();

      this.$scope.$apply();
      Sortable.init();
      // hack to set default sorting
      document.getElementById('default-sort').click();
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

HistoryController.$inject = ['$scope'];

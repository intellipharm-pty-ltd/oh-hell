import { GameService } from '/app/services/game.js';
import { StorageService } from '/app/services/storage.js';

export class HistoryController {
  constructor ($scope) {
    this.$scope = $scope;

    this.storageService = new StorageService();
    this.gameService = new GameService();

    this.loadGames();
  }

  loadGames () {
    this.storageService.getAllGames().then((games) => {
      this.games = _.map(games, (game) => {
        game.leaderboard = this.gameService.getLeaderboard(game);
        return game;
      });

      this.$scope.$apply();
    });
  }

  deleteGame (game) {
    this.storageService.deleteGame(game).then(() => {
      this.loadGames();
    });
  }
}

HistoryController.$inject = ['$scope'];

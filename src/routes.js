import { GameController } from './game/game-controller.js';
import { HistoryController } from './history/history-controller.js';

export function routes($routeProvider) {
  $routeProvider
    .when('/game/:id?', {
      template: require('./game/game-template.html'),
      controller: GameController,
      controllerAs: 'Game'
    })
    .when('/history', {
      template: require('./history/history-template.html'),
      controller: HistoryController,
      controllerAs: 'History'
    })
    .otherwise({
      redirectTo: '/game'
    });
}

routes.$inject = ['$routeProvider'];

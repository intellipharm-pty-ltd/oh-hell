import { GameController } from '/app/game/game-controller.js';
import { HistoryController } from '/app/history/history-controller.js';

export function routes ($routeProvider) {
  $routeProvider
    .when('/game/:id?', {
      templateUrl: './app/game/game-template.html',
      controller: GameController,
      controllerAs: 'Game'
    })
    .when('/history', {
      templateUrl: './app/history/history-template.html',
      controller: HistoryController,
      controllerAs: 'History'
    })
    .otherwise({
      redirectTo:'/game'
    });
}

routes.$inject = ['$routeProvider'];

export class StorageService {
  constructor () {
    this.keys = {
      databaseName: 'oh-hell',
      storeName: 'oh-hell',
      games: 'games',
      settings: 'settings',
    };

    localforage.config({
      driver: localforage.WEBSQL,
      name: this.keys.databaseName,
      version: 1.0,
      size: 4980736,
      storeName: this.keys.storeName,
      description: 'Oh Hell Game Storage'
    });

    this.games = localforage.createInstance({name: this.keys.games});
    this.settings = localforage.createInstance({name: this.keys.settings});
  }

  /** Games */

  getAllGames () {
    return this.games.getItem(this.keys.games);
  }

  getLatestGame () {
    return new Promise((resolve, reject) => {
      this.getAllGames().then((games) => {
        if (!games) {
          return resolve(null);
        }

        resolve(games[games.length - 1]);
      }, reject);
    });
  }

  saveGame (game) {
    return new Promise((resolve, reject) => {
      this.getAllGames().then((games) => {
        if (!games) {
          games = [];
          games.push(game);
          return this.games.setItem(this.keys.games, games).then(resolve, reject);
        }

        this.findGameIndex(game).then((index) => {
          if (index === -1) {
            games.push(game);
          } else {
            games[index] = game;
          }

          games = _.sortBy(games, 'startTime');

          this.games.setItem(this.keys.games, games).then(resolve, reject);
        }, reject);
      }, reject);
    });
  }

  findGameIndex (game) {
    return new Promise((resolve, reject) => {
      if (!game) {
        return reject(null);
      }

      this.getAllGames().then((games) => {
        resolve(_.findIndex(games, {id: game.id}));
      }, reject);
    });
  }

  findGameById (id) {
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(null);
      }

      this.getAllGames().then((games) => {
        resolve(_.find(games, {id: id}));
      }, reject);
    });
  }

  deleteGame (game) {
    return new Promise((resolve, reject) => {
      this.getAllGames().then((games) => {
        _.remove(games, {id: game.id});
        this.games.setItem(this.keys.games, games).then(resolve, reject);
      }, reject);
    });
  }

  /** Settings */

  saveSettings (settings) {
    this.settings.setItem(this.keys.settings, settings);
  }

  getSettings () {
    return this.settings.getItem(this.keys.settings);
  }
}

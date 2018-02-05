export class StorageService {
  constructor() {
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

    this.games = localforage.createInstance({
      name: this.keys.games
    });
    this.settings = localforage.createInstance({
      name: this.keys.settings
    });
  }

  /** Games */

  getAllGames() {
    return this.games.getItem(this.keys.games);
  }

  getLatestGame() {
    return new Promise((resolve, reject) => {
      this.getAllGames().then((games) => {
        if (!games) {
          return resolve(null);
        }

        resolve(games[games.length - 1]);
      }, reject);
    });
  }

  saveGame(game) {
    return new Promise((resolve, reject) => {
      if (!game) {
        return reject(null);
      }

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

  findGameIndex(game) {
    return new Promise((resolve, reject) => {
      if (!game) {
        return reject(null);
      }

      this.getAllGames().then((games) => {
        resolve(_.findIndex(games, {
          id: game.id
        }));
      }, reject);
    });
  }

  findGameById(id) {
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(null);
      }

      this.getAllGames().then((games) => {
        resolve(_.find(games, {
          id: id
        }));
      }, reject);
    });
  }

  deleteGame(game) {
    return new Promise((resolve, reject) => {
      this.getAllGames().then((games) => {
        _.remove(games, {
          id: game.id
        });
        this.games.setItem(this.keys.games, games).then(resolve, reject);
      }, reject);
    });
  }

  /** Settings */

  saveSettings(settings) {
    this.settings.setItem(this.keys.settings, settings);
  }

  getSettings() {
    return this.settings.getItem(this.keys.settings);
  }

  exportAllGames() {
    return new Promise((resolve, reject) => {
      this.getAllGames().then((games) => {
        if (!games) {
          return resolve(null);
        }

        this.exportFile(
          `oh-hell-all-games-${moment().format('YYYY-MM-DD-HH-mm-ss')}.json`,
          games,
          resolve,
          reject
        );
      }, reject);
    });
  }

  exportGame(id) {
    return new Promise((resolve, reject) => {
      this.findGameById(id).then((game) => {
        if (!game) {
          return resolve(null);
        }

        this.exportFile(
          `oh-hell-game-${moment(game.startTime).format('YYYY-MM-DD-HH-mm-ss')}.json`,
          game,
          resolve,
          reject
        );
      }, reject);
    });
  }

  exportFile(filename, data, resolve, reject) {
    var file = new Blob([JSON.stringify(data)], {type: 'json'});

    // create download anchor
    var a = document.createElement('a');
    var url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    // click anchor to download file
    a.click();

    // delete download anchor
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        resolve();
    }, 0);
  }

  importFile() {
    return new Promise((resolve, reject) => {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.multiple = false;
      input.addEventListener('change', (event) => {
        var files = event.target.files;

        if (files && files.length === 1) {
          var reader = new FileReader();
          reader.onload = () => {
            var text = reader.result;

            try {
              var games = JSON.parse(text);
              var count = 0;
              var promises = [];

              if (!Array.isArray(games)) {
                games = [games];
              }

              games.forEach((game) => {
                promises.push(new Promise((resolve, reject) => {
                  Promise.all(promises).then(() => {
                    this.findGameById(game.id).then((g) => {
                      // game already exists so don't override
                      if (g) {
                        resolve();
                        // add game to history
                      } else {
                        this.saveGame(game).then(resolve, reject);
                        count++;
                      }
                    });
                  });
                }));
              });

              Promise.all(promises).then(() => {
                resolve(count);
              }, reject);
            } catch (e) {
              reject(e);
            }
          };

          reader.readAsText(files[0]);
        }
      });
      input.click();
    });
  }
}

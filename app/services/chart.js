export class ChartService {
  constructor() {
    this.BID_ACCURACY = {
      UNDERBID: 'Underbid',
      ACCURATE: 'Accurate Bid',
      OVERBID: 'Overbid'
    };
  }

  displayBidAccuracyChart(games, useAverage, useIncomplete) {
    games = this.filterIncompleteGames(games, useIncomplete);
    var labels = [];

    games.forEach((game) => {
      game.settings.players.forEach((player) => {
        labels.push(player);
      });
    });

    // make the array unique
    labels = [...new Set(labels)];

    var datasets = [{
      label: this.BID_ACCURACY.ACCURATE,
      backgroundColor: this.getAccurateBidColour(),
      stack: 1,
      data: labels.map((labels) => {
        return 0;
      }),
    }, {
      label: this.BID_ACCURACY.UNDERBID,
      backgroundColor: this.getUnderbidColour(),
      stack: 1,
      data: labels.map((labels) => {
        return 0;
      }),
    }, {
      label: this.BID_ACCURACY.OVERBID,
      backgroundColor: this.getOverbidColour(),
      stack: 1,
      data: labels.map((labels) => {
        return 0;
      }),
    }];

    games.forEach((game) => {
      game.rounds.forEach((round, roundIndex) => {
        round.players.forEach((player, playerIndex) => {
          var bidAccuracy = this.calculatePlayerRoundBidAccuracy(game, playerIndex, roundIndex);

          if (bidAccuracy === this.BID_ACCURACY.UNDERBID) {
            datasets[1].data[playerIndex]++;
          } else if (bidAccuracy === this.BID_ACCURACY.ACCURATE) {
            datasets[0].data[playerIndex]++;
          } else if (bidAccuracy === this.BID_ACCURACY.OVERBID) {
            datasets[2].data[playerIndex]++;
          }
        });
      });
    });

    datasets.forEach((dataset) => {
      dataset.data.forEach((d, i) => {
        if (useAverage) {
          dataset.data[i] = (d / games.length).toFixed(2);
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

  displayBidCountChart(games, useAverage, useIncomplete) {
    games = this.filterIncompleteGames(games, useIncomplete);
    var labels = [];
    var highestBidCount = 1;

    games.forEach((game) => {
      game.rounds.forEach((round, roundIndex) => {
        round.players.forEach((player, playerIndex) => {
          var bid = parseInt(player.bid);

          if (bid > highestBidCount) {
            highestBidCount = bid;
          }
        });
      });
    });

    for (var i = 0; i <= highestBidCount; i++) {
      labels.push(i + ' Bid');
    }

    var datasets = [];

    games.forEach((game) => {
      game.rounds.forEach((round, roundIndex) => {
        round.players.forEach((player, playerIndex) => {
          var bid = parseInt(player.bid);

          if (!datasets[playerIndex]) {
            var data = [];
            labels.forEach((label) => {
              data.push(0);
            });

            datasets[playerIndex] = {
              label: game.settings.players[playerIndex],
              backgroundColor: this.getPlayerColour(playerIndex),
              borderColor: this.getPlayerColour(playerIndex),
              fill: false,
              data: data,
            };
          }

          if (!isNaN(bid)) {
            datasets[playerIndex].data[bid]++;
          }
        });
      });
    });

    datasets.forEach((dataset) => {
      dataset.data.forEach((d, i) => {
        if (useAverage) {
          dataset.data[i] = (d / games.length).toFixed(2);
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

  displayScoresChart(games, useAverage, useIncomplete) {
    games = this.filterIncompleteGames(games, useIncomplete);
    var labels = [];
    var maxNumberOfRounds = 1;

    games.forEach((game) => {
      if (game.rounds.length > maxNumberOfRounds) {
        maxNumberOfRounds = game.rounds.length;
      }
    });

    for (var i = 1; i <= maxNumberOfRounds; i++) {
      labels.push('Round ' + i);
    }

    var datasets = [];
    var threshold = games.length === 1 ? parseInt(games[0].settings.blindBidThreshold) : NaN;

    games.forEach((game, gameIndex) => {
      game.rounds.forEach((round, roundIndex) => {
        let roundHighestPoints = null;

        round.players.forEach((player, playerIndex) => {
          if (!datasets[playerIndex]) {
            datasets[playerIndex] = {
              label: game.settings.players[playerIndex],
              backgroundColor: this.getPlayerColour(playerIndex),
              borderColor: this.getPlayerColour(playerIndex),
              fill: false,
              data: [],
            };
          }

          var points = parseInt(player.points);

          if (!isNaN(points)) {
            if (roundIndex > 0) {
              points = games[gameIndex].rounds.reduce((totalPoints, currentRound, currentRoundIndex) => {
                if (currentRoundIndex > roundIndex) {
                  return totalPoints;
                }
                return totalPoints + (parseInt(currentRound.players[playerIndex].points) || 0);
              }, 0);
            }

            if (datasets[playerIndex].data[roundIndex]) {
              datasets[playerIndex].data[roundIndex].points += points;
              datasets[playerIndex].data[roundIndex].count++;
            } else {
              datasets[playerIndex].data[roundIndex] = {
                points: points,
                count: 1,
              };
            }

            if (points > roundHighestPoints || roundHighestPoints === null) {
              roundHighestPoints = points;
            }
          }
        });

        if (!isNaN(threshold)) {
          if (!datasets[round.players.length]) {
            datasets[round.players.length] = {
              label: 'Blind Bid',
              backgroundColor: this.getBlindBidColour(),
              borderColor: this.getBlindBidColour(),
              fill: false,
              data: [],
            };
          }

          var blindBidThreshold = roundHighestPoints - threshold;
          if (blindBidThreshold < 0) {
            blindBidThreshold = roundHighestPoints === null ? null : 0;
          }

          datasets[round.players.length].data.push({points: blindBidThreshold});
        }
      });
    });

    datasets.forEach((dataset) => {
      dataset.data.forEach((d, i) => {
        if (useAverage) {
          dataset.data[i] = (d.points / d.count).toFixed(2);
        } else {
          dataset.data[i] = d.points;
        }
      });
    });

    if (this.chartBidScores) {
      this.chartBidScores.destroy();
    }

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

  calculateBidAccuracy(game, playerIndex, roundIndex) {
    return Math.round(this.calculateAccurateBidCount(game, playerIndex, roundIndex) / roundIndex * 100);
  }

  calculateAccurateBidCount(game, playerIndex, roundIndex) {
    var accurateBids = 0;

    for (var i = 0; i < roundIndex; i++) {
      let bidAccuracy = this.calculatePlayerRoundBidAccuracy(game, playerIndex, i);

      if (bidAccuracy === this.BID_ACCURACY.ACCURATE) {
        accurateBids++;
      }
    }

    return accurateBids;
  }

  calculatePlayerRoundBidAccuracy(game, playerIndex, roundIndex) {
    var tricks = parseInt(game.rounds[roundIndex].players[playerIndex].tricks);
    var bid = parseInt(game.rounds[roundIndex].players[playerIndex].bid);

    if (isNaN(tricks) || isNaN(bid)) {
      return null;
    }

    if (tricks > bid) {
      return this.BID_ACCURACY.UNDERBID;
    }

    if (tricks === bid) {
      return this.BID_ACCURACY.ACCURATE;
    }

    if (tricks < bid) {
      return this.BID_ACCURACY.OVERBID;
    }

    return null;
  }

  getPlayerColour(playerIndex) {
    return [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6',
      '#6a3d9a',
      '#ffff99',
      '#b15928'
    ][playerIndex];
  }

  getUnderbidColour() {
    return '#f0ad4e';
  }

  getAccurateBidColour() {
    return '#5cb85c';
  }

  getOverbidColour() {
    return '#c9302c';
  }

  getBlindBidColour() {
    return '#e31a1c';
  }

  filterIncompleteGames(games, useIncomplete) {
    return games.filter((game) => {
      return game.isFinished || useIncomplete;
    });
  }
}

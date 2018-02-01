export class GameService {
  constructor() {}

  getLeaderboard(game) {
    var leaderboard = [];

    game.settings.players.forEach((player, playerIndex) => {
      leaderboard[playerIndex] = {
        player: player,
        points: this.calculateTotalPoints(game, playerIndex),
      };
    });

    leaderboard.sort((a, b) => {
      return b.points - a.points;
    });

    return leaderboard;
  }

  calculateTotalPoints(game, playerIndex, roundIndex) {
    var totalPoints = 0;

    game.rounds.forEach((round, i) => {
      if (roundIndex && i >= roundIndex) {
        return true;
      }

      var roundPoints = this.calculateRoundPoints(game, playerIndex, i);

      if (roundPoints) {
        totalPoints += roundPoints;
      }
    });

    return totalPoints;
  }

  calculateRoundPoints(game, playerIndex, roundIndex) {
    var cards = game.rounds[roundIndex].cardCount;
    var bid = parseInt(game.rounds[roundIndex].players[playerIndex].bid);
    var tricks = parseInt(game.rounds[roundIndex].players[playerIndex].tricks);
    var successful = tricks === bid;

    if (isNaN(bid) || isNaN(tricks)) {
      return null;
    }

    var points = 0;

    // award points per trick

    if (game.settings.winPointsPerTrick) {
      if (successful || !game.settings.winPointsPerTrickIfSuccessful) {
        if (tricks === 0 && game.settings.winPointsPerTrickIfZero) {
          points += 0.5;
        } else {
          points += tricks;
        }
      }
    }

    // lose points per trick different

    if (game.settings.losePointsPerDifference) {
      points -= Math.abs(tricks - bid);
    }

    // bonus points on successful bid

    var bonusSuccessful = parseInt(game.settings.pointsSuccessfulBid);
    if (successful && !isNaN(bonusSuccessful)) {
      points += bonusSuccessful;
    }

    if (successful && game.settings.pointsSuccessfulVariable) {
      points += cards;
    }

    if (successful && game.settings.pointsSuccessfulInverse) {
      points += (this.getHighestCardCount(game) - cards + 1);
    }

    // negative points on unsuccessful bid

    var bonusUnsuccessful = parseInt(game.settings.pointsUnsuccessfulBid);
    if (!successful && !isNaN(bonusUnsuccessful)) {
      points -= bonusUnsuccessful;
    }

    if (!successful && game.settings.pointsUnsuccessfulVariable) {
      points -= cards;
    }

    if (!successful && game.settings.pointsUnsuccessfulInverse) {
      points -= (this.getHighestCardCount(game) - cards + 1);
    }

    // blind bid

    var blindBidBonus = parseInt(game.settings.blindBidBonus);
    if (successful && game.rounds[roundIndex].players[playerIndex].blind && !isNaN(blindBidBonus)) {
      points += blindBidBonus;
    }

    if (successful && game.rounds[roundIndex].players[playerIndex].blind && game.settings.blindBidDouble) {
      points *= 2;
    }

    // set the points

    game.rounds[roundIndex].players[playerIndex].points = points;

    return points;
  }

  getHighestCardCount(game) {
    return Math.max(game.settings.cardsInFirstRound, game.settings.cardsInLastRound);
  }

  calculateBruceScoring(game) {
    var bruceScoring = [];

    for (var i = 0; i < game.leaderboard.length; i++) {
      var tieStart = null;
      var tieEnd = null;

      // if found a tie
      while (i < game.leaderboard.length && game.leaderboard[i] === game.leaderboard[i + 1]) {
        if (tieStart === null) {
          tieStart = i;
        }

        tieEnd = i;
      }

      if (tieStart && tieEnd) {
        var playersInTie = (tieEnd - tieStart);
        var tiePoints = (game.leaderboard.length * playersInTie - ((tieStart + tieEnd) / 2 * playersInTie)) / playersInTie;
        for (var j = tieStart; j <= tieEnd; j++) {
          bruceScoring.push({
            player: game.leaderboard[j].player,
            points: tiePoints,
          });
        }
        i = tieEnd;
      } else {
        bruceScoring.push({
          player: game.leaderboard[i].player,
          points: game.leaderboard.length - i,
        });
      }
    }

    return bruceScoring;
  }
}

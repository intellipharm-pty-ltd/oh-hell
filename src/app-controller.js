export class AppController {
  constructor() {
    this.darkTheme = false;
    this.showFullScore = false;
  }

  toggleTheme() {
    this.darkTheme = !this.darkTheme;
  }

  toggleScoreView() {
    this.showFullScore = !this.showFullScore;
  }
}

AppController.$inject = [];

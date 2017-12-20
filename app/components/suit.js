export var suitComponent = {
  bindings: {
    suit: '<',
  },
  template: `<span ng-if="suit.isNoTrumps()">
			<!-- &#127183; -->
			<img src="http://www.peacemonger.org/assets/images/CS155-X.jpg" height="185px" alt="No Trumps" />
		</span>
		<span ng-if="!suit.isNoTrumps()" ng-class="'suit-' + suit.suit + ' icons-suit-' + suit.suit" style="font-size:0.75em;"></span>`,
  controller: function() {
    this.isNoTrumps = function() {
      return this.suit === 'N';
    };
  },
  controllerAs: 'suit'
};

var cardComponent = {
	bindings: {
		suit: '<',
		name: '<',
		size: '@',
	},
	template: `<div class="card suit-{{card.suit}} card-size-{{card.size}}">
			<div class="card-name">
				{{card.name}}
			</div>
			<suit suit="card.suit"></suit>
	</div>`,
	controller: function() {},
	controllerAs: 'card'
};

angular.module('OhHell').component('card', cardComponent);

var suitComponent = {
	bindings: {
		suit: '<',
	},
	template: `<span ng-if="suit.isNoTrumps()">
			<!-- &#127183; -->
			<img src="http://www.peacemonger.org/assets/images/CS155-X.jpg" height="185px" alt="No Trumps" />
		</span>
		<span ng-if="!suit.isNoTrumps()" ng-class="'suit-' + suit.suit + ' suits-' + suit.suit"></span>`,
	controller: function() {
		this.isNoTrumps = function() {
			return this.suit === 'N';
		}
	},
	controllerAs: 'suit'
};

angular.module('OhHell').component('suit', suitComponent);

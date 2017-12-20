export var cardComponent = {
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

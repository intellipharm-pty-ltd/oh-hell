var module = angular.module('OhHell', []);

// bootstrap angular into the page
angular.element(document).ready(() => {
	angular.bootstrap(document.body, [module.name], {
		strictDi: true
	});
});

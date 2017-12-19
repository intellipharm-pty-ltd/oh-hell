// app
import { routes } from './app/routes.js';
import { AppController } from './app/app-controller.js';

// components
import { cardComponent } from './app/components/card.js';
import { focusIf } from './app/components/focus-if.js';
import { suitComponent } from './app/components/suit.js';


var module = angular.module('OhHell', [
		'ngRoute',
		'smart-table',
	])
	.controller('AppController', AppController)
	.component('card', cardComponent)
	.directive('focusIf', focusIf)
	.component('suit', suitComponent)
	.config(routes);


// bootstrap angular into the page
angular.element(document).ready(() => {
	angular.bootstrap(document.body, [module.name], {
		strictDi: true
	});
});

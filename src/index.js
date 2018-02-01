// dependencies
import angular from 'angular';
import 'bootstrap/dist/css/bootstrap.css';
import 'angular-route';
import 'angular-smart-table';

// styles
import './styles/index.css';
import './styles/icons.css';

// app
import { routes } from './routes.js';
import { AppController } from './app-controller.js';

// components
import { cardComponent } from './components/card.js';
import { focusIf } from './components/focus-if.js';
import { suitComponent } from './components/suit.js';


var module = angular.module('OhHell', [
		'ngRoute',
		'smart-table'
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

'use strict';

/**
 * App
 */

angular.module('fabricApp', [
    'ngRoute',
    'fabricApp.controllers',
    'fabricApp.services'
])
.config(function ($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'partials/profile',
        controller: 'ProfileCtrl'
    })
    .when('/fabric', {
        templateUrl: 'partials/home',
        controller: 'HomeCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });
        
    $locationProvider.html5Mode(true);
})
.run();
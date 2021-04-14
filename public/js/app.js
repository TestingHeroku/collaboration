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
    .when('/constelaciones', {
        templateUrl: 'partials/profile',
        controller: 'ProfileCtrl'
    })
    .when('/workspace', {
        templateUrl: 'partials/home',
        controller: 'HomeCtrl'
    })
    .when('/admin', {
        templateUrl: 'partials/admin',
        controller: 'AdminCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });
        
    $locationProvider.html5Mode(true);
})
.run();
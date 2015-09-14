(function() {

  'use strict';

  angular.module('boilerplateApp')
    .config(function($stateProvider, $urlRouterProvider) {

      // for all unmatched entries
      $urlRouterProvider.otherwise("/library");

      // separate states
      $stateProvider
        .state("library", {
          url: "/library",
          templateUrl: "views/library.html",
          controller: "LibraryController as libraryCtrl"
        })
        .state("incidents", {
          url: "/incidents",
          templateUrl: "views/incidents.html",
          controller: "IncidentController as incidentCtrl"
        })
        .state("logs", {
          url: "/logs",
          templateUrl: "views/logs.html",
          controller: "LogController as logCtrl"
        });
    });
})();

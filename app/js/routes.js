(function() {

  'use strict';

  angular.module('inspectApp')
    .config(function($stateProvider, $urlRouterProvider) {

      // for all unmatched entries
      $urlRouterProvider.otherwise("/library/list");

      // separate states
      $stateProvider
        .state("library", {
          url: "/library",
          templateUrl: "views/library.html",
          controller: "LibraryController as libraryCtrl"
        })
        .state("library.list", {
          url: "/list",
          templateUrl: "views/documents.html",
          controller: "DocumentController as docCtrl"
        })
        .state("library.new", {
          url: "/new",
          templateUrl: "views/upload.html",
          controller: "UploadController as uploadCtrl"
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

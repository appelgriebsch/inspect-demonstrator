(function() {

  'use strict';

  angular.module('inspectApp')
    .config(function($stateProvider, $urlRouterProvider) {

      // for all unmatched entries
      $urlRouterProvider.otherwise("/main/library");

      // separate states
      $stateProvider
        .state("main", {
          url: "/main",
          templateUrl: "views/main.html"
        })
        .state("main.library", {
          url: "/library",
          templateUrl: "views/library.html",
          controller: "LibraryController as ctl"
        })
        .state("main.uploadFiles", {
          url: "/uploadFiles",
          templateUrl: "views/upload.html",
          controller: "UploadController as ctl"
        })
        .state("main.captureUrl", {
          url: "/captureUrl",
          templateUrl: "views/capture.html",
          controller: "CaptureController as ctl"
        })
        .state("main.incidents", {
          url: "/incidents/list",
          templateUrl: "views/incidents.html",
          controller: "IncidentController as ctl"
        })
        .state("main.logs", {
          url: "/logs/list",
          templateUrl: "views/logs.html",
          controller: "LogController as ctl"
        });
    });
})();

(function() {

  'use strict';

  function ActivityModule() {

    this.initialize = function() {

      angular.module('inspectApp')
        .config(function($stateProvider, $urlRouterProvider) {

          $stateProvider
            .state('app.activities', {
              url: '/activities',
              views: {
                'module': {
                  templateUrl: './modules/activities/activities.html'
                }
              }
            })
            .state('app.activities.view', {
              url: '/view',
              views: {
                'content': {
                  templateUrl: './modules/activities/templates/activities.view.html',
                  controller: 'ActivitiesViewController as ctl'
                }
              }
            });

        });

      var ActivityService = require('./scripts/ActivityService.js');
      var ActivitiesViewController = require('./scripts/ActivitiesViewController');

      angular.module('inspectApp').service('ActivityService', ['PouchDBService', ActivityService]);
      angular.module('inspectApp').controller('ActivitiesViewController', ['$state', '$log', '$q', 'ActivityService', ActivitiesViewController]);
    };
  }

  module.exports = ActivityModule;

})();

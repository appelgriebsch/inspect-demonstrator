(function() {

  'use strict';

  function ActivityModule(config) {

    var moduleConfig = config;

    angular.module('inspectApp')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(`${moduleConfig.state}`, {
            url: '/activities',
            views: {
              'module': {
                templateUrl: `${moduleConfig.path}/activities.html`
              }
            }
          })
          .state(`${moduleConfig.state}.view`, {
            url: '/view',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/templates/activities.view.html`,
                controller: 'ActivitiesViewController as ctl'
              }
            }
          });

      });

    var ActivityService = require('./scripts/ActivityService.js');
    var ActivitiesViewController = require('./scripts/ActivitiesViewController');

    angular.module('inspectApp').service('ActivityService', ['PouchDBService', ActivityService]);
    angular.module('inspectApp').controller('ActivitiesViewController', ['$state', '$log', '$q', 'ActivityService', ActivitiesViewController]);

  }

  module.exports = ActivityModule;

})();

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
                templateUrl: `${moduleConfig.path}/views/activities.view.html`,
                controller: 'ActivitiesViewController as ctl'
              }
            }
          });

      });

    var ActivityDataService = require('./services/ActivityDataService.js');
    var ActivityService = require('./services/ActivityService.js');

    var ActivitiesViewController = require('./controllers/ActivitiesViewController');

    angular.module('inspectApp').service('ActivityDataService', ['PouchDBService', ActivityDataService]);
    angular.module('inspectApp').service('ActivityService', ['ActivityDataService', ActivityService]);

    angular.module('inspectApp').controller('ActivitiesViewController', ['$state', '$log', '$q', 'ActivityDataService', ActivitiesViewController]);

  }

  module.exports = ActivityModule;

})();
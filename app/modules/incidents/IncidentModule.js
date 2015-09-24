(function() {

  'use strict';

  function IncidentModule(config) {

    var moduleConfig = config;

    angular.module('inspectApp')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(`${moduleConfig.state}`, {
            url: '/incidents',
            views: {
              'module': {
                templateUrl: `${moduleConfig.path}/incidents.html`
              }
            }
          })
          .state(`${moduleConfig.state}.view`, {
            url: '/view',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/incidents.view.html`,
                controller: 'IncidentViewController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/incidents.actions.html`
              }
            }
          });

      });

    var IncidentDataService = require('./services/IncidentDataService');

    var IncidentViewController = require('./controllers/IncidentViewController');

    angular.module('inspectApp').service('IncidentDataService', ['PouchDBService', IncidentDataService]);
    angular.module('inspectApp').controller('IncidentViewController', ['$scope', '$q', 'ActivityService', 'IncidentDataService', IncidentViewController]);

  }

  module.exports = IncidentModule;

})();

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
                templateUrl: `${moduleConfig.path}/templates/incidents.view.html`,
                controller: 'IncidentViewController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/templates/incidents.actions.html`
              }
            }
          });

      });

    var IncidentViewController = require('./scripts/IncidentViewController');

    angular.module('inspectApp').controller('IncidentViewController', ['$scope', '$q', 'ActivityService', IncidentViewController]);

  }

  module.exports = IncidentModule;

})();

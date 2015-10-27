(function(angular) {

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
          })
          .state(`${moduleConfig.state}.edit`, {
            url: '/edit',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/incidents.mgmt.html`,
                controller: 'IncidentManagementController as ctl'
              }
            }
          })
          .state(`${moduleConfig.state}.search`, {
            url: '/search',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/incidents.search.html`,
                controller: 'IncidentSearchController as ctl'
              }
            }
          });
      });

    var IncidentDataService = require('./services/IncidentDataService');
    var IncidentViewController = require('./controllers/IncidentViewController');
    var IncidentManagementController = require('./controllers/IncidentManagementController');
    var IncidentSearchController = require('./controllers/IncidentSearchController');

    angular.module('inspectApp').service('IncidentDataService', ['PouchDBService', IncidentDataService]);
    angular.module('inspectApp').controller('IncidentViewController', ['$scope', '$state', '$q', 'IncidentDataService', IncidentViewController]);
    angular.module('inspectApp').controller('IncidentManagementController', ['$scope', '$state', '$q', 'IncidentDataService', IncidentManagementController]);
    angular.module('inspectApp').controller('IncidentSearchController', ['$scope', '$state', '$q', 'IncidentDataService', IncidentSearchController]);

  }

  module.exports = IncidentModule;

})(global.angular);

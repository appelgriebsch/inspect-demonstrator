/*jshint esversion: 6 */
(function(angular) {

  'use strict';

  function CasesModule(config) {

    var moduleConfig = config;
    angular.module('electron-app')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(`${moduleConfig.state}`, {
            url: '/cases',
            views: {
              'module': {
                templateUrl: `${moduleConfig.path}/cases.html`
              },
              'header@app': {
                template: `${moduleConfig.label}`
              }
            },
            redirectTo: `${moduleConfig.state}.view`
          })
          .state(`${moduleConfig.state}.view`, {
            url: '/view',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/cases.view.html`,
                controller: 'CasesViewController as $ctrl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/cases.view.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.edit`, {
            url: '/edit',
            params: {
              caseId: undefined
            },
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/case.edit.html`,
                controller: 'CaseEditController as $ctrl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/case.edit.actions.html`
              },

            }
          });
      });




    const GraphDataService = require('./services/GraphDataService');

    const CasesViewController = require('./controllers/CasesViewController');
    const CaseEditController = require('./controllers/CaseEditController');
    const CasesTreeController = require('./controllers/CasesTreeController');
    const CasesDialogController = require('./controllers/CasesDialogController');



    angular.module('electron-app').service('GraphDataService', ['PouchDBService', GraphDataService]);

    angular.module('electron-app').controller('CasesViewController', ['$scope', '$state', 'CaseOntologyDataService', 'OntologySharingService', 'GraphDataService', CasesViewController]);
    angular.module('electron-app').controller('CasesDialogController', ['$scope', '$state', '$mdDialog', 'nodeId', 'objectProperties', 'datatypeProperties', 'instances', CasesDialogController]);
    angular.module('electron-app').controller('CaseEditController', ['$scope', '$state', '$q', '$mdSidenav', '$mdDialog', '$log','CaseOntologyDataService', 'GraphDataService', CaseEditController]);
    angular.module('electron-app').controller('CasesTreeController', ['$scope', '$state',CasesTreeController]);


  }

  module.exports = CasesModule;

})(global.angular);

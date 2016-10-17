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
            }
          })
          .state(`${moduleConfig.state}.view`, {
            url: '/view',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/cases.view.html`,
                controller: 'CasesViewController as ctl'
              }/*,
               /*   'actions@app': {
               templateUrl: `${moduleConfig.path}/views/cases.view.actions.html`
               }*/
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
                controller: 'CaseEditController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/case.edit.actions.html`
              },

            }
          });
      });



    var OntologyDataService2 = require('./services/OntologyDataService2');
    var CaseOntologyDataService = require('./services/CaseOntologyDataService');

    var CasesViewController = require('./controllers/CasesViewController');
    var CaseEditController = require('./controllers/CaseEditController');
    var CasesTreeController = require('./controllers/CasesTreeController');
    var CasesDialogController = require('./controllers/CasesDialogController');


    angular.module('electron-app').service('OntologyDataService2', ['$log', 'LevelGraphService', OntologyDataService2]);
    angular.module('electron-app').service('CaseOntologyDataService', ['$log', '$filter', 'OntologyDataService2', CaseOntologyDataService]);

    angular.module('electron-app').controller('CasesViewController', ['$scope', '$state', '$log', 'CaseOntologyDataService', CasesViewController]);
    angular.module('electron-app').controller('CasesDialogController', ['$scope', '$state', '$mdDialog', 'nodeId', 'objectProperties', 'datatypeProperties', 'instances', CasesDialogController]);
    angular.module('electron-app').controller('CaseEditController', ['$scope', '$state', '$q', '$mdSidenav', '$mdDialog', 'CaseOntologyDataService', CaseEditController]);
    angular.module('electron-app').controller('CasesTreeController', ['$scope', '$state',CasesTreeController]);


  }

  module.exports = CasesModule;

})(global.angular);

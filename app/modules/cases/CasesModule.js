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
          .state(`${moduleConfig.state}.add`, {
          url: '/edit',
          views: {
            'content': {
              templateUrl: `${moduleConfig.path}/views/editCase.form.html`,
              controller: 'EditCaseController as ctl'
            },
            'actions@app': {
              templateUrl: `${moduleConfig.path}/views/editCase.form.actions.html`
            }
          }
        });
      });

    var CasesDataService = require('./services/CasesDataService');
    var OntologyDataService2 = require('./services/OntologyDataService2');

    var CasesViewController = require('./controllers/CasesViewController');
    var EditCaseController = require('./controllers/EditCaseController');




    angular.module('electron-app').service('CasesDataService', ['PouchDBService', CasesDataService]);
    angular.module('electron-app').service('OntologyDataService2', ['LevelGraphService', OntologyDataService2]);

    angular.module('electron-app').controller('CasesViewController', ['$scope', '$state', '$q', '$location', 'CasesDataService', CasesViewController]);
    angular.module('electron-app').controller('EditCaseController', ['$scope', '$state', '$q', '$location', 'CasesDataService', 'OntologyDataService2', EditCaseController]);


  }

  module.exports = CasesModule;

})(global.angular);

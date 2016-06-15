(function(angular) {

  'use strict';

  function OntologyModule(config) {

    var moduleConfig = config;

    angular.module('electron-app')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(`${moduleConfig.state}`, {
            url: '/ontology',
            views: {
              'module': {
                templateUrl: `${moduleConfig.path}/ontology.html`
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
                templateUrl: `${moduleConfig.path}/views/ontology.view.html`,
                controller: 'OntologyViewController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/ontology.view.actions.html`
              }
            }
          })
          .state(`${moduleConfig.state}.form`, {
            url: '/form',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/ontology.form.html`,
                controller: 'OntologyFormController as ctl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/ontology.form.actions.html`
              }
            }
          })
      });

    var OntologyDataService = require('./services/OntologyDataService');

    var OntologyViewController = require('./controllers/OntologyViewController');
    var OntologyFormController = require('./controllers/OntologyFormController');

    angular.module('electron-app').service('OntologyDataService', ['LevelGraphService', OntologyDataService]);

    angular.module('electron-app').controller('OntologyViewController', ['$scope', '$state', '$q', '$location', 'OntologyDataService', OntologyViewController]);
    angular.module('electron-app').controller('OntologyFormController', ['$scope', '$state', '$q',  '$location', 'OntologyDataService', OntologyFormController]);

  }

  module.exports = OntologyModule;

})(global.angular);

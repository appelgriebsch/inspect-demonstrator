(function(angular) {

  'use strict';

  function OntologyModule(config) {

    var moduleConfig = config;
    const stateView = `${moduleConfig.state}.view`;
    const stateViewSideNav = `sidenav@${stateView}`;
    angular.module('electron-app')
      .config(function($stateProvider, $urlRouterProvider) {

        $stateProvider
          .state(moduleConfig.state, {
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
          .state(stateView, {
            url: '/view',
            views: {
              'content': {
                templateUrl: `${moduleConfig.path}/views/ontology.view.html`,
                controller: 'OntologyViewController as ctl'
              },
              //TODO: change!
              'sidenav@app.ontology.view': {
                templateUrl: `${moduleConfig.path}/views/ontology.view.sidenav.html`,
                controller: 'OntologyViewSideNavController as ctl'
              }
            }
          });
      });



    const OntologyViewController = require('./controllers/OntologyViewController');
    const OntologyViewSideNavController = require('./controllers/OntologyViewSideNavController');



    angular.module('electron-app').controller('OntologyViewSideNavController', ['$scope', '$state', '$q','$mdSidenav', OntologyViewSideNavController]);
    angular.module('electron-app').controller('OntologyViewController', ['$scope', '$state', '$q', '$location', '$mdSidenav', 'OntologyDataService', 'CaseOntologyDataService', OntologyViewController]);
  }

  module.exports = OntologyModule;

})(global.angular);

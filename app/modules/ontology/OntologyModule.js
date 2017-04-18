(function(angular) {

  'use strict';

  function OntologyModule(config) {
    const _loadColorPicker = () => {

    };

    var moduleConfig = config;
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
            },
            redirectTo: `${moduleConfig.state}.view`,
          })
          .state(`${moduleConfig.state}.view`, {
            url: '/view',
            views: {
              'content': {
                template: '<ontology-view></ontology-view>'
              },
            }
          });
      });

    // load and register controllers
    const OntologyViewController = require('./controllers/OntologyViewController');
    const OntologyOptionsController = require('./controllers/OntologyOptionsController');
    const OntologyAutoCompleteController = require('./controllers/OntologyAutoCompleteController');

    angular.module('electron-app').controller('OntologyOptionsController', ['$scope', '$log','$mdDialog',  OntologyOptionsController]);
    angular.module('electron-app').controller('OntologyViewController', ['$scope', '$state', '$q',  '$mdSidenav', 'GraphService', 'MessageService', OntologyViewController]);
    angular.module('electron-app').controller('OntologyAutoCompleteController', [OntologyAutoCompleteController]);

    // load and register services
    const GraphService = require('./services/GraphService');
    angular.module('electron-app').service('GraphService', ['OntologyDataService', 'CaseOntologyDataService', GraphService]);

    // components
    angular.module('electron-app').component('ontologyAutocomplete', {
      templateUrl: `${moduleConfig.path}/views/ontology.autocomplete.html`,
      replace: 'true',
      bindings: {
        items: '<',
        onItemSelected: '&'
      },
      controller: 'OntologyAutoCompleteController',
    });
    angular.module('electron-app').component('ontologySidenav', {
      templateUrl: `${moduleConfig.path}/views/ontology.sidenav.html`,
      bindings: {
        alignment: '<',
        componentId: '<',
        onClose: '&'
      },
      replace: 'true',
      transclude: {
        'contentSlot': 'content',
        'headerSlot': 'header'
      },
    });
    angular.module('electron-app').component('ontologyView', {
      templateUrl: `${moduleConfig.path}/views/ontology.view.html`,
      replace: 'true',
      controller: 'OntologyViewController',
    });
    angular.module('electron-app').component('ontologyOptions', {
      templateUrl: `${moduleConfig.path}/views/ontology.view.options.html`,
      replace: 'true',
      bindings: {
        palette: '<',
        selectedNodes: '<',
        filters: '<',
        hiddenNodesStackSize: '<',
        onSetFocus: '&',
        onReset: '&',
        onHideNodes: '&',
        onShowNodes: '&',
        onZoomTo: '&',
        onShowNeighbours: '&',
        onFilterChanged: '&',
      },
      controller: 'OntologyOptionsController',
    });
  }

  module.exports = OntologyModule;

})(global.angular);

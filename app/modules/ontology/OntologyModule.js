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
              /*'content': {
                template: '<ontology-view></ontology-view>'
              },*/
              'content': {
                templateUrl: `${moduleConfig.path}/views/ontology.view.html`,
                controller: 'OntologyViewController as $ctrl'
              },
              'actions@app': {
                templateUrl: `${moduleConfig.path}/views/ontology.view.actions.html`
              },
            }
          });
      });

    // load and register controllers
    const OntologyViewController = require('./controllers/OntologyViewController');
    const OntologyOptionsController = require('./controllers/OntologyOptionsController');
    const OntologyMetadataController = require('./controllers/OntologyMetadataController');
    const OntologyAutoCompleteController = require('./controllers/OntologyAutoCompleteController');


    angular.module('electron-app').controller('OntologyOptionsController', ['$scope', '$mdDialog',  OntologyOptionsController]);
    angular.module('electron-app').controller('OntologyMetadataController', [OntologyMetadataController]);
    angular.module('electron-app').controller('OntologyViewController', ['$scope', '$state', '$q',  '$mdSidenav', 'GraphService', 'OntologySharingService', OntologyViewController]);
    angular.module('electron-app').controller('OntologyAutoCompleteController', [OntologyAutoCompleteController]);

    // load and register services
    const GraphService = require('./services/GraphService');
    const OntologyDataService = require('./services/OntologyDataService');
    const CaseOntologyDataService = require('./services/CaseOntologyDataService');
    const OntologySharingService = require('./services/OntologySharingService');

    angular.module('electron-app').service('GraphService', ['OntologyDataService', 'CaseOntologyDataService', GraphService]);
    angular.module('electron-app').service('CaseOntologyDataService', ['$log', '$filter', 'OntologyDataService', CaseOntologyDataService]);
    angular.module('electron-app').service('OntologyDataService', ['LevelGraphService', OntologyDataService]);
    angular.module('electron-app').service('OntologySharingService', ['OntologyDataService', OntologySharingService]);

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
    /*angular.module('electron-app').directive('ontologyView', {
      templateUrl: `${moduleConfig.path}/views/ontology.view.html`,
      replace: 'true',
      controller: 'OntologyViewController',
    });*/
    angular.module('electron-app').component('ontologyOptions', {
      templateUrl: `${moduleConfig.path}/views/ontology.options.html`,
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
        onColorChanged: '&',
      },
      controller: 'OntologyOptionsController',
    });
    angular.module('electron-app').component('ontologyMetadata', {
      templateUrl: `${moduleConfig.path}/views/ontology.metadata.html`,
      replace: 'true',
      bindings: {

      },
      controller: 'OntologyMetadataController',
    });
  }

  module.exports = OntologyModule;

})(global.angular);

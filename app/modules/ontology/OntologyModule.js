(function (angular) {
  'use strict';

  function OntologyModule (config) {

    var moduleConfig = config;
    angular.module('electron-app')
      .config(function ($stateProvider, $urlRouterProvider) {
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
            redirectTo: `${moduleConfig.state}.view`
          }).state(`${moduleConfig.state}.view`, {
          url: '/view',
          views: {
            /* 'content': {
             template: '<ontology-view></ontology-view>'
             }, */
            'content': {
              templateUrl: `${moduleConfig.path}/views/ontology.view.html`,
              controller: 'OntologyViewController as $ctrl'
            },
            'actions@app': {
              templateUrl: `${moduleConfig.path}/views/ontology.view.actions.html`
            },
            'status@app': {
              templateUrl: `${moduleConfig.path}/views/ontology.view.status.html`,
              controller: 'OntologyViewStatusController as $ctrl'
              // template: '<ontology-status></ontology-status>'
            }
          }
        }).state(`${moduleConfig.state}.cases`, {
          url: '/cases',
          views: {
            'content': {
              templateUrl: `${moduleConfig.path}/views/cases.view.html`,
              controller: 'CasesViewController as $ctrl'
            },
            'actions@app': {
              templateUrl: `${moduleConfig.path}/views/cases.view.actions.html`
            }
          }
        }).state(`${moduleConfig.state}.case`, {
          url: '/case',
          params: {
            caseId: undefined,
            mode: 'data'
          },
          views: {
            'content': {
              templateUrl: `${moduleConfig.path}/views/case.edit.html`,
              controller: 'CaseEditController as $ctrl'
            },
            'status@app': {
              templateUrl: `${moduleConfig.path}/views/case.edit.status.html`,
              controller: 'CaseEditStatusController as $ctrl'
            },
            'actions@app': {
              templateUrl: 'shell/views/shell.submit.html'
            }
          }
        }).state(`${moduleConfig.state}.node`, {
          url: '/node',
          params: {
            nodeType: undefined,
            caseId: undefined,
            mode: undefined,
            nodeId: undefined,
          },
          views: {
            'content': {
              templateUrl: `${moduleConfig.path}/views/node.edit.html`,
              controller: 'NodeEditController as $ctrl'
            },
            'actions@app': {
              templateUrl: 'shell/views/shell.submit.html'
            }
          },

        });
      });

    // load and register controllers
    const OntologyViewController = require('./controllers/OntologyViewController');
    const OntologyOptionsController = require('./controllers/OntologyOptionsController');
    const OntologyAutoCompleteController = require('./controllers/OntologyAutoCompleteController');
    const OntologyViewStatusController = require('./controllers/OntologyViewStatusController');
    const CasesViewController = require('./controllers/CasesViewController');
    const CaseEditController = require('./controllers/CaseEditController');
    const CaseEditStatusController = require('./controllers/CaseEditStatusController');

    const CasesDialogController = require('./controllers/CasesDialogController');
    const TreeController = require('./controllers/TreeController');
    const TreeNodeController = require('./controllers/TreeNodeController');
    const NodeEditController = require('./controllers/NodeEditController');
    const ListsController = require('./controllers/ListsController');



    angular.module('electron-app').controller('OntologyOptionsController', ['$scope', '$mdDialog', OntologyOptionsController]);
    angular.module('electron-app').controller('OntologyViewController', ['$scope', '$state', '$q', '$mdSidenav', 'GraphService', 'CaseOntologyDataService', 'OntologySharingService', OntologyViewController]);
    angular.module('electron-app').controller('OntologyAutoCompleteController', ['$scope', OntologyAutoCompleteController]);
    angular.module('electron-app').controller('OntologyViewStatusController', ['$scope', 'OntologyDataService', OntologyViewStatusController]);
    angular.module('electron-app').controller('CasesViewController', ['$scope', '$state', 'CaseOntologyDataService', CasesViewController]);
    angular.module('electron-app').controller('CasesDialogController', ['$scope', '$state', '$mdDialog', 'nodeId', 'objectProperties', 'datatypeProperties', 'instances', CasesDialogController]);
    angular.module('electron-app').controller('CaseEditController', ['$scope', '$state', '$q', '$mdSidenav', '$mdDialog', 'CaseOntologyDataService', 'GraphService', CaseEditController]);
    angular.module('electron-app').controller('CaseEditStatusController', ['$state', 'CaseMetadataService', CaseEditStatusController]);
    angular.module('electron-app').controller('TreeController', ['$scope', TreeController]);
    angular.module('electron-app').controller('TreeNodeController', ['$scope', TreeNodeController]);
    angular.module('electron-app').controller('NodeEditController', ['$scope', '$state', 'CaseOntologyDataService', NodeEditController]);
    angular.module('electron-app').controller('ListsController', ['$scope',  ListsController]);


    // load and register services
    const GraphService = require('./services/GraphService');
    const OntologyDataService = require('./services/OntologyDataService');
    const CaseOntologyDataService = require('./services/CaseOntologyDataService');
    const OntologySharingService = require('./services/OntologySharingService');
    const CaseMetadataService = require('./services/CaseMetadataService');
    const GraphDataService = require('./services/GraphDataService');


    angular.module('electron-app').service('GraphService', ['OntologyDataService', 'CaseOntologyDataService', GraphService]);
    angular.module('electron-app').service('CaseOntologyDataService', ['OntologyDataService', 'CaseMetadataService', CaseOntologyDataService]);
    angular.module('electron-app').service('OntologyDataService', ['LevelGraphService', OntologyDataService]);
    angular.module('electron-app').service('OntologySharingService', ['OntologyDataService', OntologySharingService]);
    angular.module('electron-app').service('CaseMetadataService', ['PouchDBService', CaseMetadataService]);
    angular.module('electron-app').service('GraphDataService', ['PouchDBService', GraphDataService]);


    // components
    angular.module('electron-app').component('ontologyAutocomplete', {
      templateUrl: `${moduleConfig.path}/views/ontology.autocomplete.html`,
      replace: 'true',
      bindings: {
        items: '<',
        onItemSelected: '&'
      },
      controller: 'OntologyAutoCompleteController'
    });
    angular.module('electron-app').component('ontologyStatus', {
      templateUrl: `${moduleConfig.path}/views/ontology.view.status.html`,
      replace: 'true',
      bindings: {
        node: '<'
      },
      controller: 'OntologyViewStatusController'
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
      }
    });
    angular.module('electron-app').component('ontologyOptions', {
      templateUrl: `${moduleConfig.path}/views/ontology.options.html`,
      replace: 'true',
      bindings: {
        palette: '<',
        selectedNodes: '<',
        filters: '<',
        onSetFocus: '&',
        onReset: '&',
        onRemoveNodes: '&',
        onShowCaseNodes: '&',
        onRemoveCaseNodes: '&',
        onZoomTo: '&',
        onShowNeighbours: '&',
        onFilterChanged: '&',
        onColorChanged: '&'
      },
      controller: 'OntologyOptionsController'
    });

    angular.module('electron-app').component('ontologyTree', {
      templateUrl: `${moduleConfig.path}/views/ontology.tree.html`,
      replace: 'true',
      bindings: {
        treeData: '<',
        nodeId: '@',
        nodeLabel: '@',
        nodeChildren: '@',
      },
      controller: 'TreeController'
    });

    angular.module('electron-app').component('ontologyLists', {
      templateUrl: `${moduleConfig.path}/views/ontology.lists.html`,
      replace: 'true',
      bindings: {
        classIndividualsData: '<',
        multipleCaseData: '<'

      },
      controller: 'ListsController'
    });
  }

  module.exports = OntologyModule;
})(global.angular);

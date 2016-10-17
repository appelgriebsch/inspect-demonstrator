(function(angular, vis) {

  'use strict';

  function CaseEditController($scope, $state, $q, $mdSidenav, $mdDialog, CaseOntologyDataService) {
    //<editor-fold desc="Constructor">
    this.state = $state.$current;

    this.graphOptions = {
      height: '100%',
      width: '100%',
      autoResize: true,
      nodes: {
        shape: 'dot',
        scaling: {
          min: 10,
          max: 30,
          label: {
            min: 10,
            max: 30,
            drawThreshold: 9,
            maxVisible: 15
          }
        },
        font: {
          size: 12,
          face: 'Helvetica Neue, Helvetica, Arial'
        }
      },
      groups: {
        instanceNode: {
        },
        dataNode: {
          shape: 'box',
          color: {
            border: 'aa80ff',//'#2B7CE9',
            background: '#bb99ff',//'#97C2FC',
            highlight: {
              border: '#aa80ff',
              background: '#ddccff'
            },
            hover: {
              border: '#aa80ff',
              background: '#ddccff'
            },
          },
        }
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: false,
        selectConnectedEdges: true
      }
    };
    this.network = undefined;
    this.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet(),

      addedInstances: {},
      editedInstances: {},
      deletedInstances: {}
    };
    $scope.data = {
      'case': {},
      classesTree: [],
      selectedNode: undefined
    };
    $scope.viewData = {
      showFooter: false
    };
    //</editor-fold>

    var _showNodeDialog = (nodeId) => {
      if (!nodeId) {
        return;
      }
      var that = this;
      $mdDialog.show({
        controller: 'CasesDialogController',
        controllerAs: 'ctl',
        templateUrl: 'modules/cases/views/dialog.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        windowClass: 'large-Modal',
        locals: {nodeId: nodeId, objectProperties: CaseOntologyDataService.getObjectProperties(), datatypeProperties: [], instances: $scope.data['case'].individuals}
      }).then(function(result) {
        if (result.toBeDeleted) {
          that.data.nodes.remove(result.individual.iri);
          // XXX: removes the individual completely! what should happen if the individual is also in another case?
          CaseOntologyDataService.removeIndividual(result.individual, $scope.data['case']);
        }
        that.network.fit();
      });
    };
    var _createGraph = () => {
      const container = document.getElementById('ontology-graph');
      const t = $scope.data['case'].generateNodesAndEdges();
      this.data.nodes.add(t.nodes);
      this.data.edges.add(t.edges);
      this.network = new vis.Network(container, this.data, this.graphOptions);

      this.network.on('click', (params) => {
        if (params.nodes.length > 0) {
          if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
            _showNodeDialog(params.nodes[0]);
          }
        }

      });
    };


    $scope.isEditable = (element) => {
      if ((element === 'identifier') && ($scope.data['case'].status === 'new')) {
        return true;
      }
      if ((element === 'name') && (($scope.data['case'].status === 'new') || ($scope.data['case'].status === 'open'))) {
        return true;
      }
      if ((element === 'investigator') && (($scope.data['case'].status === 'new') || ($scope.data['case'].status === 'open'))) {
        return true;
      }
      if ((element === 'description') && (($scope.data['case'].status === 'new') || ($scope.data['case'].status === 'open'))) {
        return true;
      }
      if ((element === 'nodes') && (($scope.data['case'].status === 'new') || ($scope.data['case'].status === 'open'))) {
        return true;
      }
      return false;
    };

     //<editor-fold desc="Actions">
    $scope.$on('case-cancel', () => {
      $state.go('app.cases.view');
    });

    $scope.$on('case-save', () => {

    });

    $scope.toggleSidebar = () => {
      $q.when(true).then(() => {
        $mdSidenav('sidebar-tree').toggle();
      });
    };
    //</editor-fold>

    $scope.newInstanceNode = (clazzIri) => {
      CaseOntologyDataService.createAndAddIndividual(clazzIri, `Node ${this.data.nodes.length}`, $scope.data['case']).then((individual) => {
        this.data.nodes.add($scope.data['case'].generateNode(individual));
        this.network.fit();
      }).catch((err) => {
        $scope.setError('InsertAction', 'insert', err);
        $scope.setReady(true);
      });
    };

    //<editor-fold desc="Initialization">
    /**
     * Initializes dependant services.
     * After completion the case and the ontology class structure is loaded.
     */
    this.initialize = () => {
      if (angular.isUndefined($state.params.caseId)) {
        $state.go('app.cases.view');
        return;
      }
      $scope.setBusy('Loading Case...');
      CaseOntologyDataService.initialize().then(() => {
        $scope.data.classesTree = CaseOntologyDataService.getClassTree();
        return Promise.all([
          CaseOntologyDataService.loadCase($state.params.caseId)
        ]);
      }).then((result) => {
        $scope.data['case'] = result[0];
        _createGraph();
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
        $state.go('app.cases.view');
      });

    };
    //</editor-fold>

  }
  module.exports = CaseEditController;

})(global.angular, global.vis);

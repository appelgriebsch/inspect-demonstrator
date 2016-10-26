(function(angular, vis) {

  'use strict';

  var uuid = require('uuid');

  function CaseEditController($scope, $state, $q, $mdSidenav, $mdDialog, $log, CaseOntologyDataService) {
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
      edges: {
        arrows: 'to'
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
      physics: {
        barnesHut: {
          gravitationalConstant: -13250,
          centralGravity: 0.75,
          springLength: 135,
          damping: 0.28,
          avoidOverlap: 1
        },
        minVelocity: 0.75
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
        locals: {nodeId: nodeId, objectProperties: CaseOntologyDataService.getObjectProperties(), datatypeProperties: CaseOntologyDataService.getDatatypeProperties(), instances: angular.copy($scope.data['case'].individuals)}
      }).then(function(result) {
        if (result.toBeDeleted === true) {
          $scope.setBusy('Deleting node...');
          that.data.nodes.remove(result.individual.iri);
          // XXX: removes the individual completely! what should happen if the individual is also in another case?
          CaseOntologyDataService.removeIndividual(result.individual, $scope.data['case']).then(() => {
            that.network.fit();
            $scope.setReady(true);
          }).catch((err) => {
            $scope.setError('DeleteAction', 'delete', err);
            $scope.setReady(true);
          });

        }
        if (result.toBeRenamed === true) {
          $scope.setBusy('Renaming node...');
          const oldIri = result.individual.iri;
          _renameNode(oldIri, result.newName).then(() => {
            $scope.setReady(true);
          }).catch((err) => {
            $scope.setError('EditAction', 'mode edit', err);
            $scope.setReady(true);
          });
        }
        if (result.newRelation === true) {
          $scope.setBusy('Adding relation...');
          if (result.relation.type === 'object') {
            _addObjectRelation(result.individualIri, result.relation).then(() => {
              $scope.setReady(true);
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
              $scope.setReady(true);
            });
          }
          if (result.relation.type === 'value') {
            _addValueRelation(result.individualIri, result.relation).then(() => {
              $scope.setReady(true);
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
              $scope.setReady(true);
            });
          }
        }
      });
    };
    const _addValueRelation = (individualIri, relation) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.addDatatypeProperty($scope.data['case'], individualIri, relation.propIri, relation.targetValue).then(()=> {
          const id = uuid.v4();
          this.data.nodes.add({id: id, label: relation.targetValue, title: relation.targetValue, group: 'dataNode'});
          this.data.edges.add({from: individualIri, to: id, label: relation.propLabel, title: relation.propLabel});
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _addObjectRelation = (individualIri, relation) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.addObjectProperty($scope.data['case'], individualIri, relation.propIri, relation.targetIri).then(()=> {
          this.data.edges.add({from: individualIri, to: relation.targetIri, label: relation.propLabel, title: relation.propLabel});
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _renameNode = (oldIri, newName) => {
      return new Promise((resolve, reject) => {
        // change node name
        CaseOntologyDataService.renameIndividual($scope.data['case'], oldIri, newName).then((individual) => {
          if (!angular.isUndefined(individual)) {
            const newNode = $scope.data['case'].generateNode(individual);
            // add new node
            this.data.nodes.add(newNode);
            //update edges
            var updates = [];
            angular.forEach(this.data.edges.get(), (edge) => {
              if (edge.from === oldIri) {
                updates.push({id: edge.id, from: individual.iri});
              }
              if (edge.to === oldIri) {
                updates.push({id: edge.id, to: individual.iri});
              }
            });
            this.data.edges.update(updates);
            //delete old node
            this.data.nodes.remove(oldIri);
            this.network.fit();
          }
          resolve();
        }).catch((err) => {
          reject(err);
        });
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
      const r = Math.floor((Math.random() * 1000) + 1);
      CaseOntologyDataService.createAndAddIndividual(clazzIri, `Node ${r}`, $scope.data['case']).then((individual) => {
        this.data.nodes.add($scope.data['case'].generateNode(individual));
        this.network.fit();
      }).catch((err) => {
        $scope.setError('AddAction', 'add', err);
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
        $log.debug('case ', result[0]);
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

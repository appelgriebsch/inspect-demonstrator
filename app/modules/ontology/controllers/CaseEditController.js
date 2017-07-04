(function(angular, vis) {

  'use strict';
  function CaseEditController($scope, $state, $q, $mdSidenav, $mdDialog, CaseOntologyDataService, GraphService) {
    const vm = this;
    vm.state = $state.$current;


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
            // drawThreshold: 9,
            drawThreshold: 5,
            maxVisible: 15
          }
        },
        font: {
          size: 12,
          face: 'Helvetica Neue, Helvetica, Arial'
        }
      },
      edges: {
        arrows: 'to',
        arrowStrikethrough: false,
        color: '#000000'
      },
      'physics': {
        'barnesHut': {
          'gravitationalConstant': -24650,
          'centralGravity': 0,
          'springLength': 300,
          'springConstant': 0.08,
          'damping': 1,
          'avoidOverlap': 1
        },
        'maxVelocity': 40,
        'minVelocity': 0.75,
        'timestep': 0.86
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: true,
        multiselect: false
      }
    };

    vm.network = undefined;
    vm.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet()
    };
    vm.classTree =  [];
    vm.currentCase = undefined;


    const _showNodeDialog = (nodeId) => {
      if (!nodeId) {
        return;
      }
      $mdDialog.show({
        controller: 'CasesDialogController as $ctrl',
        templateUrl: 'modules/cases/views/dialog.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        windowClass: 'large-Modal',
        locals: {nodeId: nodeId, objectProperties: CaseOntologyDataService.getObjectProperties(), datatypeProperties: CaseOntologyDataService.getDatatypeProperties(), instances: vm.currentCase.individuals}
      }).then(function(result) {
        if (result.addRelation === true) {
          if (result.type === 'object') {
            _addObjectRelation(result.individual, result.property, result.target).then(() => {
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
            });
          }
          if (result.type === 'value') {
            _addValueRelation(result.individual, result.property, result.target).then(() => {
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
            });
          }
        }
        if (result.removeRelation === true) {
          if (result.type === 'object') {
            _removeObjectRelation(result.individual, result.property, result.target).then(() => {
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
            });
          }
          if (result.type === 'value') {
            _removeValueRelation(result.individual, result.property, result.target).then(() => {
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
            });
          }
        }
      });
    };

    const _removeValueRelation = (individual, property, target) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.removeDatatypeProperty(individual, property, target).then(()=> {
          const node = _createDataNode(individual.iri, property.iri, target);
          const edges = this.data.edges.get({
            filter: function (edge) {
              return edge.from === individual.iri && edge.to === node.id && edge.label ===  property.label;
            }
          });
          this.data.edges.remove(edges);
          this.data.nodes.remove(node);
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _removeObjectRelation = (individual, property, target) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.removeObjectProperty(individual, property, target).then(()=> {
          const edges = this.data.edges.get({
            filter: function (edge) {
              return edge.from === individual.iri && edge.to === target.iri && edge.label ===  property.label;
            }
          });
          this.data.edges.remove(edges);
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _addValueRelation = (individual, property, target) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.addDatatypeProperty(individual, property, target).then(()=> {
          const node = _createDataNode(individual.iri, property.iri, target);
          vm.data.nodes.add(node);
          vm.data.edges.add({from: individual.iri, to: node.id, label: property.label, title: property.label});
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _addObjectRelation = (individual, property, target) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.addObjectProperty(individual, property, target).then(()=> {
          this.data.edges.add({from: individual.iri, to: target.iri, label: property.label, title:  property.label});
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _renameNode = (oldIri, newName) => {
      return new Promise((resolve, reject) => {
        // change node name
        CaseOntologyDataService.renameIndividual(oldIri, newName).then((individual) => {
          const position = vm.network.getPositions([oldIri])[oldIri];

          const edgesToUpdate = vm.data.edges.get(vm.network.getPositions([oldIri])[oldIri]);
          edgesToUpdate.forEach((edge) => {
            if (edge.from === oldIri) {
              edge.from = individual.iri;
            }
            if (edge.to === oldIri) {
              edge.to = individual.iri;
            }
          });

          vm.data.nodes.add(_createIndividualNode(individual));
          vm.data.edges.update(edgesToUpdate);
          vm.data.nodes.remove(oldIri);
          vm.network.moveNode(individual.iri, position.x, position.y);
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };
    const  _createIndividualNode = (individual) => {
      return {
        id: individual.iri,
        label: individual.label,
        title: `${individual.label} of type ${individual.classIris[0]}` ,
        group: 'instanceNode'
      };
    };
    const _createDataNode = (individualIri, propertyIri, target) => {
      const nodeId = `${individualIri}_${propertyIri}_${target}`;
      return {
        id: nodeId,
        label: target,
        title: target,
        group: 'dataNode'
      };
    };

    const _createGraph = (nodes, edges) => {
      const container = document.getElementById('ontology-graph');

      vm.network = new vis.Network(container, vm.data, vm.graphOptions);
      vm.data.nodes.add(nodes);
      vm.data.edges.add(edges);
      vm.network.fit();

      // when a node is selected all incoming and outgoing edges of that node
      // are selected too, that's why this event is used for displaying the
      // meta data of a selected item
      this.network.on('select', (params) => {
        if ((params.edges !== undefined) && (params.edges.length > 0)) {
          console.log("Selected edge", params.edges);
        }
        if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
          vm.selectedNodes = vm.data.nodes.get(params.nodes, {fields: ['id', 'label', 'type']});

        }
      });
      this.network.on('doubleClick', (params) => {
        if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
          vm.selectedNode = vm.data.nodes.get(params.nodes, {fields: ['id', 'label', 'type']})[0];
          if (vm.selectedNode.type === "INDIVIDUAL_NODE") {
            $state.go('app.ontology.node', {mode: 'edit', nodeId: vm.selectedNode.id, caseId: vm.currentCase.identifier});
          }
        }
      });

    };

    //<editor-fold desc="Actions">
    $scope.$on('cancel', () => {
      $state.go('app.ontology.cases');
    });

    $scope.$on('submit', () => {
      $scope.setBusy('Saving Case...');
      CaseOntologyDataService.saveCase(vm.currentCase).then(() => {
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('EditAction', 'mode edit', err);
        $scope.setReady(true);

      });
    });
    vm.toggleSidebar = (componentId) => {
      $mdSidenav(componentId)
        .toggle()
        .then(() => {
        })
        .catch((err) => {
          console.log(err);
        });
    };

    //</editor-fold>

    vm.onNodeClicked = (id) => {
      $state.go('app.ontology.node', {mode: 'add', nodeType: id, caseId: vm.currentCase.identifier});
    };


    vm.newInstanceNode = (id) => {

      const r = Math.floor((Math.random() * 1000) + 1);
      CaseOntologyDataService.createAndAddIndividual(id, `Node_${r}`, vm.currentCase).then((individual) => {
        vm.currentCase.individuals.push(individual);
        this.data.nodes.add(_createIndividualNode(individual));
        this.network.fit();
      }).catch((err) => {
        $scope.setError('AddAction', 'add', err);
        $scope.setReady(true);
      });
    };

    $scope.editEdges = () => {
      if (this.data.nodes.get($scope.selectedKnotenNameFull).group === 'instanceNode') {
        _showNodeDialog($scope.selectedKnotenNameFull );
      }
    };

    $scope.renameNode = (event) => {
      const confirm = $mdDialog.prompt()
        .title('Rename Node')
        .placeholder('Node name')
        .ariaLabel('Node name')
        .initialValue($scope.selectedKnotenName )
        .targetEvent(event)
        .ok('Save')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function(result) {
        _renameNode($scope.selectedKnotenNameFull, result).then(() => {
          $scope.setReady(true);
        }).catch((err) => {
          $scope.setError('EditAction', 'mode edit', err);
          $scope.setReady(true);
        });
      });
    };

    $scope.deleteNode = () => {
      $scope.setBusy('Deleting node...');

      // XXX: removes the individual completely! what should happen if the individual is also in another case?
      CaseOntologyDataService.removeIndividual($scope.selectedKnotenNameFull).then(() => {
        this.data.nodes.remove($scope.selectedKnotenNameFull);
        this.network.fit();
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('DeleteAction', 'delete', err);
        $scope.setReady(true);
      });
    };

    //<editor-fold desc="Initialization">
    /**
     * Initializes dependant services.
     * After completion the case and the ontology class structure is loaded.
     */
    vm.$onInit = () => {
      if (!$state.params.caseId) {
        $state.go('app.ontology.cases');
        return;
      }
      if ($state.params.mode === 'graph') {
        vm.selectedTab = 1;
      } else {
        vm.selectedTab = 0;
      }
      $scope.setBusy('Loading Case...');
      Promise.all([
        CaseOntologyDataService.initialize(),
        //GraphDataService.initialize()
      ]).then(() => {
        return Promise.all([
          CaseOntologyDataService.loadCase($state.params.caseId),
          CaseOntologyDataService.classTree(),
          GraphService.caseNodes($state.params.caseId)
        ]);
      }).then((result) => {
        vm.currentCase = angular.copy(result[0]);
        vm.classTree = result[1];
        _createGraph(result[2].nodes, result[2].edges);
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
        $state.go('app.ontology.cases');
      });
    };
    //</editor-fold>

  }
  module.exports = CaseEditController;

})(global.angular, global.vis);

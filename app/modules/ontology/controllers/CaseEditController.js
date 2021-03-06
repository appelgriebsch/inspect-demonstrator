(function(angular, vis) {

  'use strict';
  function CaseEditController($scope, $state, $mdSidenav, CaseOntologyDataService, GraphService) {
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


    const _attachAction = (clazz, clickActions)=> {
      clazz.clickActions = clickActions;
      clazz.children.forEach((c) => {
        _attachAction(c, clickActions);
      });
    };

    const _createTreeData = () => {
      const clickActions = [{
        icon: 'add',
        func: vm.onNodeClicked,
      }];
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.classTree().then((result) => {
          vm.classTree = result.map((c) => {
            _attachAction(c, clickActions);
            return c;
          });
          resolve();
        }).catch(reject);
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

      CaseOntologyDataService.initialize()
        .then(GraphService.initialize)
        .then(() => {
        return Promise.all([
          CaseOntologyDataService.loadCase($state.params.caseId, false),
          GraphService.createFilters(),
          _createTreeData()
        ]);
      }).then((result) => {
        vm.currentCase = angular.copy(result[0]);

        const filters = result[1].map((f) => {
          if ((f.id === $state.params.caseId) || (f.id === GraphService.nodeTypes.DATA_NODE)){
            f.enabled = true;
          } else {
            f.enabled = false;
          }
          return f;
        });
        return GraphService.nodes(vm.currentCase.individualIris, vm.data.nodes.getIds(), filters);
      }).then((result) => {
       _createGraph(result.nodes, result.edges);
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

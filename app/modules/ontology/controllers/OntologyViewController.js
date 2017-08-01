(function (angular, vis) {
  'use strict';

  function OntologyViewController ($scope, $state, $q, $mdSidenav, GraphService, CaseOntologyDataService, OntologySharingService) {
    const convert = require('color-convert');
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
        multiselect: true
      }
    };

    vm.network = undefined;
    vm.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet()
    };

    vm.autocomplete = {
      items: []
    };
    vm.lists = {
      caseData: [],
      classIndividualsData: []
    };


    /** for options menu **/
    vm.palette = ['#3399ff', '#bb99ff', '#579d1c', '#ff420e', '#ffd320', '#4b1f6f', '#004586', '#E91E63', '#69F0AE', '#795548'];
    vm.selectedNodes = [];
    vm.filters = [];

    const _adjustColor = (colorHex, amount) => {
      if (amount === 0) {
        return colorHex;
      }
      const colorHSL = convert.hex.hsl(colorHex.slice(1,7));
      colorHSL[2] = Math.max(0,  Math.min(255, colorHSL[2] + amount*colorHSL[2]));
      return `#${convert.hsl.hex(colorHSL)}`;
    };

    const _createColorOptions = (color) => {
      return {
        border: _adjustColor(color, -0.2),
        background: color,
        highlight: {
          border: color,
          background: _adjustColor(color, 0.25)
        },
        hover: {
          border: color,
          background: _adjustColor(color, 0.25)
        }
      };
    };

    const _createGraph = () => {
      const container = document.getElementById('ontology-graph');

      vm.network = new vis.Network(container, vm.data, vm.graphOptions);

      // when a node is selected all incoming and outgoing edges of that node
      // are selected too, that's why this event is used for displaying the
      // meta data of a selected item
      this.network.on('select', (params) => {
        if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
          vm.selectedNodes = vm.data.nodes.get(params.nodes, {fields: ['id', 'label', 'type']});
          // TODO: rather nasty, better solution?
          $scope.$root.$broadcast('NodesSelectedEvent', vm.data.nodes.get(params.nodes));
          $scope.$apply();
        }
      });
    };
    const _removeCaseNodes = (caseId) => {
      console.log("_removeCaseNodes", caseId);
      const case_ =  vm.lists.caseData.find((c) => {
        return c.id === caseId;
      });
      if (case_) {
        const nodeIds = case_.children.map((i) => {
          return i.id;
        });
        const datatypeNodes = [];
        nodeIds.forEach((n) => {
          const nodes = this.data.nodes.getNodes(this.network.getConnectedNodes(nodeIds[0], {
            filter: (n) => {
              return true;
            }
          }));
          console.log(nodes);
        });
      }
    };
    const _removeCaseNodes2 = (iri) => {
      console.log("_showCaseNodes", iri);
      //TODO: do properly
      const caseIdentifier = iri.split("#")[1];
      const nodeIds = vm.data.nodes.getIds({
        filter: (n) => {
          if (iri === 'none') {

            return (Array.isArray(n.cases) && (n.cases.length === 0));
          }
          return (Array.isArray(n.cases) && (n.cases.length === 1) && (n.cases[0] === caseIdentifier));
        }
      });
      vm.data.nodes.remove(nodeIds);
      const edgeIds = vm.data.edges.getIds({
        filter: (e) => {
          return ((nodeIds.indexOf(e.from) > -1) || (nodeIds.indexOf(e.to) > -1));
        }
      });
      vm.data.edges.remove(edgeIds);
      vm.network.fit();
    };

    const _setFilters = (filters) => {
      vm.filters = filters;
      let i = 0;
      for (const f of filters) {
        f.color = vm.palette[i % vm.palette.length];
        vm.colorChanged(f.id, f.color);
        i++;
      }
    };

    const _showCaseNodes = (caseId) => {
      console.log("_showCaseNodes", caseId);
      const case_ =  vm.lists.caseData.find((c) => {
        return c.id === caseId;
      });
      if (case_) {
        $scope.setBusy('Loading case data...');
        const nodeIds = case_.children.map((i) => {
          return i.id;
        });
        const filters = vm.filters.map((f) => {
          return {id: f.id, enabled: f.enabled, type: f.type};
        });
        GraphService.nodes(nodeIds, vm.data.nodes.getIds(), filters).then((result) => {
          _updateNodesAndEdges(result);
          $scope.setReady(true);
        }).catch((err) => {
          $scope.setError('SearchAction', 'search', err);
          $scope.setReady(true);
        });
      }
    };

    const _updateNodesAndEdges = (data) => {
      const nodes = vm.applyColors(data.nodes);
      vm.data.nodes.update(nodes);
      vm.data.edges.update(data.edges);
    };

    const _showClassNode = (id) => {
      let node;
      const filters_1 = vm.filters.map((f) => {
        if (f.id === GraphService.nodeTypes.CLASS_NODE) {
          return {id: f.id, enabled: true, type: f.type};
        }
        return {id: f.id, enabled: f.enabled, type: f.type};
      });
      const filters_2 = vm.filters.map((f) => {
        return {id: f.id, enabled: f.enabled, type: f.type};
      });

      GraphService.nodes([id], vm.data.nodes.getIds(), filters_1).then((result) => {
        if (result.nodes.length === 0) {
          return Promise.resolve({nodes: [], edges: []});
        }
        node = result.nodes[0];
        return GraphService.neighbors(node, filters_2, 1, vm.data.nodes.getIds());
      }).then(_updateNodesAndEdges)
        .catch((err) => {
          $scope.setError('SearchAction', 'search', err);
          $scope.setReady(true);
        });
    };

    const _createTreeData = () => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.treeData().then((result) => {
          vm.lists.multipleCaseData = result.multipleCasesTree.map((i) => {
            i.children = i.cases;
            i.clickActions = [{
              icon: 'my_location',
              func: vm.zoomTo,
            }];
            return i;
          });
          vm.lists.classIndividualsData = result.classIndividualsTree.map((c) => {
            c.children = c.individuals.map((i) => {
              i.clickActions = [{
                icon: 'my_location',
                func: vm.zoomTo,
              }];
              return i;
            });
            c.clickActions = [{
              icon: 'visibility',
              func: _showClassNode,
            }];
            return c;
          });
          resolve();
        }).catch(reject);
      });
    };

    /** inner events **/
    vm.itemSelected = (item) => {
      if (item) {
        vm.setFocus([item]);
      }
    };
    vm.setFocus = (nodes) => {
      vm.reset();
      const nodeIds = nodes.map((n) => {
        return n.id;
      });
      const filters = vm.filters.map((f) => {
        if (f.id === GraphService.nodeTypes.DATA_NODE) {
          return {id: f.id, enabled: false, type: f.type};
        }
        return {id: f.id, enabled: f.enabled, type: f.type};
      });
      GraphService.nodes(nodeIds, vm.data.nodes.getIds(), filters)
        .then(_updateNodesAndEdges)
        .catch((err) => {
          $scope.setError('SearchAction', 'search', err);
        });
    };
    vm.toggleSidebar = (componentId) => {
      $mdSidenav(componentId)
        .toggle()
        .then(() => {
        })
        .catch((err) => {
          console.log(err);
        });
    };

    vm.zoomTo = (nodeId) => {
      const positions = vm.network.getPositions(nodeId);
      if (positions[nodeId]) {
        vm.network.moveTo({
          position: {
            x: positions[nodeId].x,
            y: positions[nodeId].y
          },
          scale: 2,
          animation: true
        });
      }
    };

    vm.applyColors = (array) => {
      return array.map((item) => {
        const filter = vm.filters.find((f) => {
          return f.id === item.group;
        });
        if (filter) {
          const colorOptions = _createColorOptions(filter.color);
          if (item.icon) {
            item.icon.color = filter.color;
          } else {
            item.color = colorOptions;
          }
        }
        return item;
      });
    };

    vm.showNeighbours = (depth) => {
      $scope.setBusy('Loading neighbours...');
      const node = vm.selectedNodes[0];
      const filters = vm.filters.map((f) => {
        return {id: f.id, enabled: f.enabled, type: f.type};
      });
      GraphService.neighbors(node, filters, depth, vm.data.nodes.getIds()).then((result) => {
        const nodes = vm.applyColors(result.nodes);
        vm.data.nodes.update(nodes);
        vm.data.edges.update(result.edges);
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    vm.showCaseNodes = (id) => {
      const filter = vm.filters.find((f) => {
          return ((f.id === id) && (f.type === 'case') && (f.enabled === true));
      });
      if (!filter) {
        return;
      }
      const filters = vm.filters.map((f) => {
        return {id: f.id, enabled: f.enabled, type: f.type};
      });
      $scope.setBusy('Loading case data...');
      if (id === GraphService.tags.NO_CASE) {
        CaseOntologyDataService.loadEntitesWithoutCase()
          .then(GraphService.individualsToNodes)
          .then((result) => {
          _updateNodesAndEdges(result);
          $scope.setReady(true);
        }).catch((err) => {
          $scope.setError('SearchAction', 'search', err);
          $scope.setReady(true);
        });
      } else {
        CaseOntologyDataService.loadCase(id).then((result) => {
          return GraphService.nodes(result.individualIris, vm.data.nodes.getIds(), filters);
        }).then((result) => {
          _updateNodesAndEdges(result);
          $scope.setReady(true);
        }).catch((err) => {
          $scope.setError('SearchAction', 'search', err);
          $scope.setReady(true);
        });
      }
    };
    vm.removeCaseNodes = (id) => {
      const filter = vm.filters.find((f) => {
        return ((f.id === id) && (f.type === 'case') && (f.enabled === true));
      });
      if (!filter) {
        return;
      }
      const nodeIds = vm.data.nodes.getIds({
        filter: (n) => {
          return ((n.cases) && (n.cases.length === 1) && (n.cases[0] === id));
        }
      });
      const edgeIds = vm.data.edges.get({
        filter: (e) => {
          return ((nodeIds.indexOf(e.from) > -1) || (nodeIds.indexOf(e.to) > -1));
        }
      });
      vm.data.nodes.remove(nodeIds);
      vm.data.edges.remove(edgeIds);
    };

    vm.reset = () => {
      vm.selectedNodes = [];
      vm.selectedEdges = [];

      vm.network.unselectAll();
      vm.data.nodes.clear();
      vm.data.edges.clear();

      $scope.$root.$broadcast('NodesDeselectedEvent');
    };
    vm.removeNodes = () => {
      const nodeIds = vm.selectedNodes.map((n) => {
        return n.id;
      });
      vm.selectedNodes = [];
      vm.data.nodes.remove(nodeIds);
      const edgeIds = vm.data.edges.getIds({
        filter: (e) => {
          return ((nodeIds.indexOf(e.from) > -1) || (nodeIds.indexOf(e.to) > -1));
        }

      });
      vm.data.edges.remove(edgeIds);
      $scope.$root.$broadcast('NodesDeselectedEvent');
    };

    vm.colorChanged = (id, color) => {
      const nodes = vm.data.nodes.get({
        fields: ['id', 'icon'],
        filter: function (node) {
          return node.group === id;
        }
      });
      const colorOptions = _createColorOptions(color);
      nodes.forEach((n) => {
        if (n.icon) {
          n.icon.color = color;
        } else {
          n.color = colorOptions;
        }
      });
      vm.data.nodes.update(nodes);
    };

    vm.$onInit = () => {
      $scope.setBusy('Loading ontology data...');
      CaseOntologyDataService.initialize()
        .then(GraphService.initialize)
        .then(_createTreeData)
        .then(GraphService.createFilters)
        .then(_setFilters)
        .then(_createGraph)
        .then(CaseOntologyDataService.searchTerms)
        .then((result) => {
          vm.autocomplete.items = result;
          $scope.setReady(true);
        }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };


    /** events from the actions menu**/
    //TODO: case list!
    $scope.$on('import-ontology', () => {
      const targetPath = OntologySharingService.requestOpenFile();
      if ((targetPath !== undefined) && (targetPath.length > 0)) {
        $scope.setBusy('Importing ontology...');
        OntologySharingService.import(targetPath[0]).then(() => {
          CaseOntologyDataService.reset();
          return CaseOntologyDataService.initialize();
        }).then(CaseOntologyDataService.createMetadataForCases)
          .then(() => {
            const info = $scope.createEventFromTemplate('ReceiveAction', 'import_export');
            info.description = 'The ontology has been imported successfully.';
            info.object = {};
            info.result = {};
            return $scope.writeLog('info', info);
          }).then(() => {
          $scope.notify('Import finished successfully', 'The ontology has been imported successfully.');
          vm.$onInit();
        }).catch((err) => {
          $scope.setError('ReceiveAction', 'import_export', err);
          $scope.setReady(true);
        });
      }
    });

    $scope.$on('export-ontology', () => {
      const targetPath = OntologySharingService.requestSaveFile();

      if (targetPath !== undefined) {
        $scope.setBusy('Exporting ontology...');

        OntologySharingService.export(targetPath).then(() => {
          const info = $scope.createEventFromTemplate('SendAction', 'share');
          info.description = 'The ontology has been exported successfully.';
          info.object = {};
          info.result = {};
          return $scope.writeLog('info', info);
        }).then(() => {
          $scope.notify('Export finished successfully', 'The ontology has been exported successfully.');
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('SendAction', 'share', err);
          $scope.setReady(true);
        });
      }
    });
    $scope.$on('edit-cases', () => {
      $state.go('app.ontology.cases');
    });
    $scope.$on('settings', () => {
      $state.go('app.ontology.profile');
    });
  }

  module.exports = OntologyViewController;
})(global.angular, global.vis);

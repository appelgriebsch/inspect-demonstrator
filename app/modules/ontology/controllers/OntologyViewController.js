(function (angular, vis) {
  'use strict';

  function OntologyViewController ($scope, $state, $q, $mdSidenav, OntologyDataService, GraphService, CaseOntologyDataService, OntologySharingService) {
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


    /** for options menu **/
    vm.palette = ['#3399ff', '#bb99ff', '#579d1c', '#ff420e', '#ffd320', '#4b1f6f', '#004586', '#E91E63', '#69F0AE', '#795548'];
    vm.selectedNodes = [];
    vm.filters = [];

    const _adjustColor = (color, amount) => {
      color = color.slice(1);
      let num = parseInt(color, 16);

      let r = (num >> 16) + amount;
      if (r > 255) {
        r = 255
      } else if (r < 0) {
        r = 0
      }

      let b = ((num >> 8) & 0x00FF) + amount;
      if (b > 255) {
        b = 255
      } else if (b < 0) {
        b = 0
      }

      let g = (num & 0x0000FF) + amount;
      if (g > 255) {
        g = 255
      } else if (g < 0) {
        g = 0
      }
      return '#' + (g | (b << 8) | (r << 16)).toString(16);
    };

    const _createColorOptions = (color) => {
      return {
        border: _adjustColor(color, -40),
        background: color,
        highlight: {
          border: color,
          background: _adjustColor(color, 40)
        },
        hover: {
          border: color,
          background: _adjustColor(color, 40)
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
    const _removeCaseNodes = (caseIdentifier) => {
      const nodeIds = vm.data.nodes.getIds({
        filter: (n) => {
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

    const _removeSchemaNodes = () => {
      const nodeIds = vm.data.nodes.getIds({
        filter: (n) => {
          return (n.type === GraphService.nodeTypes.CLASS_NODE);
        }
      });
      vm.data.nodes.remove(nodeIds)
      const edgeIds = vm.data.edges.getIds({
        filter: (e) => {
          return ((nodeIds.indexOf(e.from) > -1) || (nodeIds.indexOf(e.to) > -1));
        }

      });
      vm.data.edges.remove(edgeIds)
      vm.network.fit();
    };

    const _setFilters = (filters) => {
      vm.filters = filters;
      let i = 0;
      for (const f of filters) {
        if (f.hasColor === true) {
          f.color = vm.palette[i % vm.palette.length];
          vm.colorChanged(f.id, f.color);
          i++;
        }
      }
    };

    vm.$onInit = () => {
      $scope.setBusy('Loading ontology data...');

      OntologyDataService.initialize()
        .then(CaseOntologyDataService.initialize)
        .then(GraphService.initialize)
        .then((result) => {
          _createGraph();
          _setFilters(result);
          return GraphService.searchTerms();
        }).then((result) => {
          vm.autocomplete.items = result;
          $scope.setReady(true);
        }).catch((err) => {
          $scope.setError('SearchAction', 'search', err);
          $scope.setReady(true);
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
        return {id: f.id, enabled: f.enabled};
      });
      GraphService.focusNodes(nodeIds, filters).then((result) => {
        const nodes = vm.applyColors(result);
        vm.data.nodes.add(nodes);

        vm.network.fit();
      }).catch((err) => {
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
      vm.network.moveTo({
        position: {
          x: positions[nodeId].x,
          y: positions[nodeId].y
        },
        scale: 2,
        animation: true
      });
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
        return {id: f.id, enabled: f.enabled};
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

    vm.reset = () => {
      vm.selectedNodes = [];
      vm.selectedEdges = [];

      vm.network.unselectAll();
      vm.data.nodes.clear();
      vm.data.edges.clear();

      $scope.$root.$broadcast('NodesDeselectedEvent');
    };

    vm.filterChanged = (id, enabled) => {
      const filter = vm.filters.find((f) => {
        return f.id === id;
      });
      if (!filter) {
        return;
      }
      if (enabled === false) {
        vm.selectedNodes = [];
        if (filter.type === 'schema') {
          _removeSchemaNodes();
        }
        if (filter.type === 'case') {
          _removeCaseNodes(id);
        }
      } else {
       /* GraphService.updateFilter(id, enabled).then((result) => {
          console.log("filter result", result);
          const nodes = vm.applyColors(result.nodes);
          vm.data.nodes.update(nodes);
          vm.data.edges.update(result.edges);
          vm.network.fit();
        }).catch((err) => {
          $scope.setError('SearchAction', 'search', err);
        }); */
      }
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

    /** events from the actions menu**/
    $scope.$on('import-ontology', () => {
      const targetPath = OntologySharingService.requestOpenFile();
      if ((targetPath !== undefined) && (targetPath.length > 0)) {
        $scope.setBusy('Importing ontology...');
        OntologySharingService.import(targetPath[0]).then(() => {
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
  }

  module.exports = OntologyViewController;
})(global.angular, global.vis);

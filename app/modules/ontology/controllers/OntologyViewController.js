(function(angular, vis) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $mdSidenav, GraphService, OntologySharingService) {
    const vm = this;
    vm.state = $state;

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
        arrows: 'to',
      },
      "physics": {
        "barnesHut": {
          "gravitationalConstant": -24650,
          "centralGravity": 0,
          "springLength": 300,
          "springConstant": 0.08,
          "damping": 1,
          "avoidOverlap": 1
        },
        "maxVelocity": 40,
        "minVelocity": 0.75,
        "timestep": 0.86
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: true,
        selectConnectedEdges: true,
        multiselect: true,
      }
    };
    vm.network = undefined;
    vm.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet(),
    };

    vm.items = [];
    vm.state = $state.$current;

    /** for options menu **/
    vm.palette = ['#3399ff', '#bb99ff', '#579d1c', '#ff420e','#ffd320','#4b1f6f','#004586', '#E91E63', '#69F0AE' ,'#795548'];
    vm.selectedNodes = [];
    vm.hiddenNodesStackSize = 0;
    vm.filters = [];

    const _adjustColor = (color, amount) => {
      color = color.slice(1);
      let num = parseInt(color, 16);

      let r = (num >> 16) + amount;
      if (r > 255) {
        r = 255;
      }
      else if (r < 0) {
        r = 0;
      }

      let b = ((num >> 8) & 0x00FF) + amount;
      if (b > 255) {
        b = 255;
      }
      else if (b < 0) {
        b = 0;
      }

      let g = (num & 0x0000FF) + amount;
      if (g > 255) {
        g = 255;
      }
      else if (g < 0) {
        g = 0
      }
      ;

      return "#" + (g | (b << 8) | (r << 16)).toString(16);
    };

    const _createColorOptions = (color) => {
      return {
        color: {
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
        }
      };
    };

    const _createGraph = (nodes, edges, filters) => {
      return new Promise((resolve, reject) => {
        const container = document.getElementById('ontology-graph');

        //vm.network = new vis.Network(container, vm.data, vm.graphOptions);
        vm.network = new vis.Network(container, vm.data, vm.graphOptions);
        _resetViewport(nodes, edges);
        _setFilters(filters);

        // when a node is selected all incoming and outgoing edges of that node
        // are selected too, that's why this event is used for displaying the
        // meta data of a selected item
        this.network.on('select', (params) => {
          if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
            vm.selectedNodes = vm.data.nodes.get(params.nodes, {fields: ['id', 'label']});
            $scope.$apply();
          }
        });
        resolve();
      });
    };

    const _resetViewport = (nodes, edges) => {
      vm.data.nodes.clear();
      vm.data.edges.clear();
      vm.data.nodes.add(nodes);
      vm.data.edges.add(edges);

      vm.items = nodes.map((node) => {
        return {id: node.id, label: node.label};
      });

      vm.network.fit();
    };

    const _updateViewport = (nodes, edges) => {
      const nodeIdsToBeRemoved = vm.data.nodes.getIds({
        filter: function (item) {
          const a = nodes.find((n) => {
            return n.id === item.id;
          });
          return (a === undefined);
        }
      });
      vm.data.nodes.update(nodes);
      // vm.data.nodes.remove(nodeIdsToBeRemoved);
      vm.data.edges.update(edges);

      vm.items = nodes.map((node) => {
        return {id: node.id, label: node.label};
      });
    };

    const _setFilters = (filters) => {
      vm.filters = filters;
      let i = 0;
      for (const f of filters) {
        if (f.hasColor === true) {
          f.color = vm.palette[ i % vm.palette.length];
          vm.colorChanged(f.id, f.color);
          i++;
        }
      }
    };

    vm.$onInit = () => {
      $scope.setBusy('Loading ontology data...');

      GraphService.initialize().then((result) => {
        return _createGraph(result.nodes, result.edges, result.filters);
      }).then(() => {
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };


    /** inner events **/
    vm.itemSelected = (item) => {
      //if (vm.data.nodes)
      vm.network.selectNodes([item.id]);
      vm.selectedNodes = [item];
      vm.setFocus();
    };
    vm.setFocus = () => {
      const nodeIds = vm.selectedNodes.map((n) => {
        return n.id;
      });

      GraphService.focusNodes(nodeIds).then((result) => {
        _resetViewport(result.nodes, result.edges);
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
    vm.reset = () => {
      $scope.setBusy('Resetting Graph...');
      vm.selectedNodes = [];
      vm.selectedEdges = [];

      vm.network.unselectAll();

      GraphService.reset().then((result) => {
        vm.hiddenNodesStackSize = result.stackSize;
        _resetViewport(result.nodes, result.edges);
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    vm.hideNodes = () => {
      const nodeIds = vm.selectedNodes.map((n) => {
        return n.id;
      });
      GraphService.hideNodes(nodeIds).then((result) => {
        vm.data.nodes.update(result.nodes);
        vm.data.edges.update(result.edges);
        vm.hiddenNodesStackSize = result.stackSize;
        vm.selectedNodes = [];
        vm.network.unselectAll();
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
      });
    };

    vm.showNodes = () => {
      GraphService.showNodes().then((result) => {
        vm.data.nodes.update(result.nodes);
        vm.data.edges.update(result.edges);
        vm.hiddenNodesStackSize = result.stackSize;
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
      });
    };

    vm.showNeighbours = (depth) => {
      const nodeIds = vm.selectedNodes.map((n) => {
        return n.id;
      });
      GraphService.showNeighbors(nodeIds, depth).then((result) => {
        _updateViewport(result.nodes, result.edges);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
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
    vm.colorChanged = (id, color) => {
      const groupOptions = {};
      groupOptions[id] = _createColorOptions(color);
      vm.network.setOptions({
        groups: groupOptions
      });

    };
    vm.filterChanged = (id, enabled) => {
      GraphService.updateFilter(id, enabled).then((result) => {
        vm.data.nodes.update(result.nodes);
        vm.data.edges.update(result.edges);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
      });

    };
    /** events from the actions menu**/
    $scope.$on('edit-node', () => {
      console.log(vm.state);
     //$state.go('app.cases.edit', {caseId: caseId});
    });
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

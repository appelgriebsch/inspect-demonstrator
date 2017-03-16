(function(angular, vis) {

  'use strict';

  var uuid = require('uuid');

  function CaseEditController($scope, $state, $q, $mdSidenav, $mdDialog, $log, CaseOntologyDataService, GraphDataService) {
    //<editor-fold desc="Constructor">
    this.state = $state.$current;

    this.graphOptions = {};
    this.network = undefined;
    this.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet(),
    };
    $scope.data = {
      'case': {},
      initialCase: {},
      'graph': {},
      initalGraph: {},
      'autosetup': {},
      classesTree: [],
      selectedNode: undefined
    };
    $scope.grapOpt = [];
    $scope.viewData = {
      showFooter: false
    };
    //</editor-fold>

    //isShowContent() -->
    $scope.showInstanzknoten = true;
    $scope.showAttributsknoten = true;
    $scope.showKanten = true;
    $scope.showPhysikalische = true;
    $scope.showInstanzknotenActive = 'active';
    $scope.showAttributsknotenActive = 'active';
    $scope.showKantenActive = 'active';
    $scope.showPhysikalischeActive = 'active';

    var allNodes;
    var allEdges;
    var highlightActive = false;
    var rightSideNavIsOpen = false;
    var prevFocused = undefined;

    $scope.nextLevelNumber = 1;

    $scope.gradBtnHide = 'ng-hide';
    $scope.focusedNode = "---";

    $scope.toggleSidebarLeft = buildToggler('left');
    $scope.toggleSidebarRight = buildToggler('right');

    function buildToggler(componentId) {
      return function() {
        $mdSidenav(componentId).toggle();
      };
    }



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
        if (result.addRelation === true) {
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
        if (result.removeRelation === true) {
          $scope.setBusy('Removing relation...');
          if (result.relation.type === 'object') {
            _removeObjectRelation(result.individualIri, result.relation).then(() => {
              $scope.setReady(true);
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
              $scope.setReady(true);
            });
          }
          if (result.relation.type === 'value') {
            _removeValueRelation(result.individualIri, result.relation).then(() => {
              $scope.setReady(true);
            }).catch((err) => {
              $scope.setError('EditAction', 'mode edit', err);
              $scope.setReady(true);
            });
          }
        }
      });
    };

    const _removeValueRelation = (individualIri, relation) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.removeDatatypeProperty($scope.data['case'], individualIri, relation.propIri, relation.targetValue).then(()=> {
          const that = this;
          const nodes = [];
          const edges = this.data.edges.get({
            filter: function (edge) {
              const result = edge.from === individualIri && that.data.nodes.get(edge.to).label === relation.targetValue && edge.label === relation.propLabel;
              if (result === true) {
                nodes.push(edge.to)
              }
              return result;
            }
          });
          this.data.edges.remove(edges);
          this.data.nodes.remove(nodes);
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _removeObjectRelation = (individualIri, relation) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.removeObjectProperty($scope.data['case'], individualIri, relation.propIri, relation.targetIri).then(()=> {
          const edges = this.data.edges.get({
            filter: function (edge) {
              return edge.from === individualIri && edge.to === relation.targetIri && edge.label === relation.propLabel;
            }
          });
          this.data.edges.remove(edges);
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _addValueRelation = (individualIri, relation) => {
      return new Promise((resolve, reject) => {
        //TODO: add type if applicable
        const type = undefined;
        CaseOntologyDataService.addDatatypeProperty($scope.data['case'], individualIri, relation.propIri, relation.targetValue, type).then(()=> {
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

    const _createGraph = () => {
      const container = document.getElementById('ontology-graph');
      const t = $scope.data['case'].generateNodesAndEdges();

      this.data.nodes.add(t.nodes);
      this.data.edges.add(t.edges);

      $scope.setBusy('Loading Graph...');
      GraphDataService.initialize().then(() => {
        return Promise.all([
          GraphDataService.loadOptions($state.params.caseId),
          GraphDataService.loadOptions($state.params.caseId + 'autosetup')
          ]);
      }).then((result) => {

        $scope.data['graph'] = result[0];
        $scope.data.initialGraph = angular.copy(result[0]);
        this.graphOptions = $scope.data['graph'];

        delete this.graphOptions['_id'];
        delete this.graphOptions['_rev'];

        $scope.data['autosetup'] = result[1];
        _loadGraphSetup($scope.data['autosetup']);

        this.network = new vis.Network(container, this.data, this.graphOptions);
        _loadGraphFieldData(this.graphOptions);
        this.network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
              _showNodeDialog(params.nodes[0]);
            }
          }
        });

        this.network.on("click",$scope.fokusGraph);

        $scope.setReady(true);
      }).catch((err) => {
        if (err.name == "not_found") {

          $scope.data['graph'] = GraphDataService.newGraphOptions();
          $scope.data.initialGraph = angular.copy(GraphDataService.newGraphOptions());
          this.graphOptions = $scope.data['graph'];

          delete this.graphOptions['_id'];
          delete this.graphOptions['_rev'];

          $scope.data['autosetup'] = GraphDataService.newAutoSetupOptions();
          _loadGraphSetup($scope.data['autosetup']);

          this.network = new vis.Network(container, this.data, this.graphOptions);
          _loadGraphFieldData(this.graphOptions);
          this.network.on('doubleClick', (params) => {
            if (params.nodes.length > 0) {
              if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
                _showNodeDialog(params.nodes[0]);
              }
            }
          });

          this.network.on("click",$scope.fokusGraph);

          $scope.setReady(true);
        }
        else {
          $scope.setError('SearchAction', 'search', err);
          $scope.setReady(true);
          $state.go('app.cases.view');
        }
      });
    };

    const _loadGraphFieldData = (data) => {
      $scope.data.case.iksize = data.groups.instanceNode.size;
      $scope.data.case.ikcolor = data.groups.instanceNode.color.background;
      $scope.data.case.ikcolorFrame = data.groups.instanceNode.color.border;
      $scope.data.case.ikform = data.groups.instanceNode.shape;
      $scope.data.case.aksize = data.groups.dataNode.size;
      $scope.data.case.akcolor = data.groups.dataNode.color.background;
      $scope.data.case.akcolorFrame = data.groups.dataNode.color.border;
      $scope.data.case.akform = data.groups.dataNode.shape;
      $scope.data.case.ksize = data.edges.width;
      $scope.data.case.kcolor = data.edges.color;
      $scope.data.case.kform = data.edges.smooth.type;
      $scope.data.case.physicsCG = data.physics.barnesHut.centralGravity;
      $scope.data.case.physicsSP = data.physics.barnesHut.springLength;
      $scope.data.case.physicsDamping = data.physics.barnesHut.damping;
      $scope.data.case.physicsAO = data.physics.barnesHut.avoidOverlap;
    };

    const _loadGraphSetup = (data) => {
      $scope.data.autosetup.instanzKnoten = data.instanzKnoten;
      $scope.data.autosetup.attributsKnoten = data.attributsKnoten;
      $scope.data.autosetup.kanten = data.kanten;
    };

    $scope.onInstanzKnotenChange = () => {
      var container = document.getElementById('ontology-graph');
      if (!$scope.data.autosetup.instanzKnoten) {
        this.graphOptions.groups.instanceNode.color.background = $scope.data.case.ikcolor;
        this.graphOptions.groups.instanceNode.color.border = $scope.data.case.ikcolorFrame;
        this.graphOptions.groups.instanceNode.font.color = $scope.invertColor($scope.data.case.ikcolor);
        this.graphOptions.groups.instanceNode.size = parseInt($scope.data.case.iksize);
        this.graphOptions.groups.instanceNode.shape = $scope.data.case.ikform;
        this.network = new vis.Network(container, this.data, this.graphOptions);
      }
      else {
        var defGraph = GraphDataService.newGraphOptions();
        this.graphOptions.groups.instanceNode.color.background = defGraph.groups.instanceNode.color.background;
        this.graphOptions.groups.instanceNode.color.border = defGraph.groups.instanceNode.color.border;
        if (this.graphOptions.groups.instanceNode.font === undefined) {
          this.graphOptions.groups.instanceNode.font = {
            size : defGraph.groups.instanceNode.font.size,
            color: defGraph.groups.instanceNode.font.color
          }
        }
        this.graphOptions.groups.instanceNode.size = defGraph.groups.instanceNode.size;
        this.graphOptions.groups.instanceNode.shape = defGraph.groups.instanceNode.shape;
        this.network = new vis.Network(container, this.data, this.graphOptions);
      }
      this.network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
              _showNodeDialog(params.nodes[0]);
            }
          }
        });
      this.network.on("click",$scope.fokusGraph);
    };

    $scope.onAttributsKnotenChange = () => {
      var container = document.getElementById('ontology-graph');
      if (!$scope.data.autosetup.attributsKnoten) {
        this.graphOptions.groups.dataNode.color.background = $scope.data.case.akcolor;
        this.graphOptions.groups.dataNode.color.border = $scope.data.case.akcolorFrame;
        this.graphOptions.groups.dataNode.size = parseInt($scope.data.case.aksize);
        this.graphOptions.groups.dataNode.shape = $scope.data.case.akform;
        this.network = new vis.Network(container, this.data, this.graphOptions);
      }
      else {
        var defGraph = GraphDataService.newGraphOptions();
        this.graphOptions.groups.dataNode.color.background = defGraph.groups.dataNode.color.background;
        this.graphOptions.groups.dataNode.color.border = defGraph.groups.dataNode.color.border;
        this.graphOptions.groups.dataNode.size = defGraph.groups.dataNode.size;
        this.graphOptions.groups.dataNode.shape = defGraph.groups.dataNode.shape;
        this.network = new vis.Network(container, this.data, this.graphOptions);
      }
      this.network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
              _showNodeDialog(params.nodes[0]);
            }
          }
        });
      this.network.on("click",$scope.fokusGraph);
    };

    $scope.onKantenChange = () => {
      var container = document.getElementById('ontology-graph');
      if (!$scope.data.autosetup.kanten) {
        this.graphOptions.edges.color = $scope.data.case.kcolor;
        this.graphOptions.edges.width = parseInt($scope.data.case.ksize);
        this.graphOptions.edges.smooth.type = $scope.data.case.kform;
      }
      else {
        var defGraph = GraphDataService.newGraphOptions();
        this.graphOptions.edges.color = defGraph.edges.color;
        this.graphOptions.edges.width = parseInt(defGraph.edges.width);
        this.graphOptions.edges.smooth.type  = defGraph.edges.smooth.type;
      }
      this.network = new vis.Network(container, this.data, this.graphOptions);
      this.network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
              _showNodeDialog(params.nodes[0]);
            }
          }
        });
      this.network.on("click",$scope.fokusGraph);
    };

    $scope.onPhysicChange = () => {
      var container = document.getElementById('ontology-graph');
      if (!$scope.data.autosetup.physik) {
        this.graphOptions.physics.barnesHut.centralGravity = $scope.data.case.physicsCG;
        this.graphOptions.physics.barnesHut.springLength = $scope.data.case.physicsSP;
        this.graphOptions.physics.barnesHut.damping = $scope.data.case.physicsDamping;
        this.graphOptions.physics.barnesHut.avoidOverlap = $scope.data.case.physicsAO;
        this.network = new vis.Network(container, this.data, this.graphOptions);
      }
      else {
        var defGraph = GraphDataService.newGraphOptions();
        this.graphOptions.physics.barnesHut.centralGravity = defGraph.physics.barnesHut.centralGravity;
        this.graphOptions.physics.barnesHut.springLength = defGraph.physics.barnesHut.springLength;
        this.graphOptions.physics.barnesHut.damping = defGraph.physics.barnesHut.damping;
        this.graphOptions.physics.barnesHut.avoidOverlap = defGraph.physics.barnesHut.avoidOverlap;
        this.network = new vis.Network(container, this.data, this.graphOptions);
      }
      this.network.on('doubleClick', (params) => {
          if (params.nodes.length > 0) {
            if (this.data.nodes.get(params.nodes[0]).group === 'instanceNode') {
              _showNodeDialog(params.nodes[0]);
            }
          }
        });
      this.network.on("click", $scope.fokusGraph);
    };

    $scope.fokusGraph = (params) => {
      if (params.nodes.length > 0) {
        if (params.nodes[0].match(/#/g) !== null) {
          $scope.selectedKnotenNameFull = params.nodes[0];
          $scope.selectedKnotenName = params.nodes[0].match(/#(.*)/g).toString().substring(1);
          $scope.$apply();
        }
      }

      if (!rightSideNavIsOpen && params.nodes.length > 0) {
        //open
        $scope.toggleSidebarRight();
        rightSideNavIsOpen = true;
      }
      else if (rightSideNavIsOpen && params.nodes.length < 1) {
        //close
        $scope.toggleSidebarRight();
        rightSideNavIsOpen = false;
      }
    };

    $scope.setFocus = (params) => {
      allNodes = this.data['nodes'].get({returnType:"Object"});
      allEdges = this.data['edges'].get({returnType:"Object"});
      if ($scope.selectedKnotenName !== undefined) {
        $scope.physicsOnOffData = this.network.physics.physicsEnabled;

        $scope.gradBtnHide = '';
        highlightActive = true;
        $scope.focusedNode = params.selectedKnotenName;
        var selectedNode = params.selectedKnotenNameFull;

        for (var edgeId in allEdges) {
          allEdges[edgeId].hidden = true;
        }

        for (var nodeId in allNodes) {
          if (nodeId !== selectedNode) {
            allNodes[nodeId].hidden = true;
          }
          // else {
          //   //allNodes[nodeId].color = $scope.invertColor(this.graphOptions.groups.instanceNode.color.background);
          //   // if (prevFocused !== undefined  && prevFocused !== $scope.focusedNode) {
          //   //   allNodes["http://www.AMSL/GDK/ontologie#" + prevFocused].color = this.graphOptions.groups.instanceNode.color.background;
          //   // }
          // }
        }

        this.network.moveNode(params.selectedKnotenNameFull, 0, 0);

        $scope.updateNodes("setfocus");
        $scope.updateEdges();

        prevFocused = $scope.focusedNode;
        $scope.setFocusDisableFadeOut = true;
      }
    };

    $scope.clearFocus = (params) => {
     if (highlightActive === true) {
      allNodes = this.data['nodes'].get({returnType:"Object"});
      allEdges = this.data['edges'].get({returnType:"Object"});

        // reset all nodes
        for (var nodeId in allNodes) {
          allNodes[nodeId].hidden = false;
          // if (allNodes[nodeId].title === $scope.focusedNode) {
          //     delete allNodes["http://www.AMSL/GDK/ontologie#" + $scope.focusedNode].color;
          //      //= this.graphOptions.groups.instanceNode.color.background;
          // }
        }

        // reset all edges
        for (var edgeId in allEdges) {
          allEdges[edgeId].hidden = false;
        }

        highlightActive = false;
        $scope.gradBtnHide = 'ng-hide';
        this.network.physics.physicsEnabled = true;
        this.network.physics.startedStabilization = true;

        $scope.updateNodes("clearfocus");
        $scope.updateEdges();

        $scope.focusedNode = '---';
        $scope.setFocusDisableFadeOut = false;
      }
    };

    $scope.nextLevel = (params) => {
      allNodes = this.data['nodes'].get({returnType:"Object"});
      allEdges = this.data['edges'].get({returnType:"Object"});

      var selectedNode = params.selectedKnotenNameFull;
      if ($scope.selectedKnotenName !== undefined) {
        var connectedNodes = this.network.getConnectedNodes(selectedNode);
        var connectedEdges = this.network.getConnectedEdges(selectedNode);
        var allConnectedNodes = [];
        var i,j;
        var degrees = $scope.nextLevelNumber;
        var allConnectedNodes2d = [];
        var allConnectedNodes3d = [];
        var allConnectedEdges2d = [];
        var allConnectedEdges3d = [];

        var selectedCoord = this.network.getPositions(selectedNode);

        for (i = 0; i < connectedNodes.length; i++) {
          for (var nodeId in allNodes){
            if (connectedNodes[i] === nodeId) {
              allNodes[nodeId].hidden = false;
            }
          }
        }

        for (i = 0; i < connectedEdges.length; i++) {
          for (var edgeId in allEdges){
            if (connectedEdges[i] === edgeId) {
              allEdges[edgeId].hidden = false;
            }
          }
        }

        // get the degree nodes & edges
        if (degrees > 1) {
          for (j = 0; j < connectedNodes.length; j++) {
            allConnectedNodes2d = allConnectedNodes2d.concat(this.network.getConnectedNodes(connectedNodes[j]));
          }
          for (j = 0; j < connectedEdges.length; j++) {
            if (connectedNodes[j] !== undefined) {
              allConnectedEdges2d = allConnectedEdges2d.concat(this.network.getConnectedEdges(connectedNodes[j]));
            }
          }
          if (degrees > 2) {
            for (j = 0; j < allConnectedNodes2d.length; j++) {
              allConnectedNodes3d = allConnectedNodes3d.concat(this.network.getConnectedNodes(allConnectedNodes2d[j]));
            }
            for (j = 0; j < allConnectedEdges2d.length; j++) {
              if (allConnectedNodes2d[j] !== undefined) {
                allConnectedEdges3d = allConnectedEdges3d.concat(this.network.getConnectedEdges(allConnectedNodes2d[j]));
              }
            }
          }
        }

        for (i = 0; i < allConnectedNodes2d.length; i++) {
          allNodes[allConnectedNodes2d[i]].hidden = false;
        }

        for (j = 0; j < allConnectedEdges2d.length; j++) {
          allEdges[allConnectedEdges2d[j]].hidden = false;
        }

        for (i = 0; i < allConnectedNodes3d.length; i++) {
          allNodes[allConnectedNodes3d[i]].hidden = false;
        }

        for (j = 0; j < allConnectedEdges3d.length; j++) {
          allEdges[allConnectedEdges3d[j]].hidden = false;
        }

        $scope.updateNodes("nextlevel");
        $scope.updateEdges();
        $scope.setFocusDisableFadeOut = false;
      }
    };

    $scope.fadeOut = (params) => {
      allNodes = this.data['nodes'].get({returnType:"Object"});
      allEdges = this.data['edges'].get({returnType:"Object"});

      var connectedEdges = this.network.getConnectedEdges(params.selectedKnotenNameFull);

      allNodes[params.selectedKnotenNameFull].hidden = true;

      for (var i = 0; i < connectedEdges.length; i++) {
        for (var edgeId in allEdges){
          if (connectedEdges[i] === edgeId) {
            allEdges[edgeId].hidden = true;
          }
        }
      }

      $scope.updateNodes("fadeout");
      $scope.updateEdges();

      $scope.selectedKnotenName = undefined;
    };

    $scope.resetGraph = () => {
      allNodes = this.data['nodes'].get({returnType:"Object"});
      allEdges = this.data['edges'].get({returnType:"Object"});
      // reset all nodes
      for (var nodeId in allNodes) {
         allNodes[nodeId].hidden = false;
      }

        // reset all edges
      for (var edgeId in allEdges) {
        allEdges[edgeId].hidden = false;
      }

      $scope.gradBtnHide = 'ng-hide';
      this.network.physics.physicsEnabled = true;
      this.network.physics.startedStabilization = true;
      $scope.focusedNode = '---';
      $scope.setFocusDisableFadeOut = false;
      $scope.updateNodes("resetgraph");
      $scope.updateEdges();
      highlightActive = false;
      $scope.setFocusDisableFadeOut = false;
    };

    $scope.updateNodes  = (params) => {
      var updateArray = [];
      for (var nodeId in allNodes) {
        if (allNodes.hasOwnProperty(nodeId)) {
          updateArray.push(allNodes[nodeId]);
        }
      }
      this.data['nodes'].update(updateArray);
    };

    $scope.updateEdges = () => {
      var updateArray = [];
      for (var edgeId in allEdges) {
        if (allEdges.hasOwnProperty(edgeId)) {
          updateArray.push(allEdges[edgeId]);
        }
      }
      this.data['edges'].update(updateArray);
    };

    $scope.physicsOnOff = () => {
      this.network.physics.startedStabilization =  $scope.physicsOnOffData;
      this.network.physics.physicsEnabled = $scope.physicsOnOffData;
    };

    $scope.invertColor = (hexTripletColor) => {
      var color = hexTripletColor;
      color = color.substring(1);
      color = parseInt(color, 16);
      color = 0xFFFFFF ^ color;
      color = color.toString(16);
      color = ("000000" + color).slice(-6);
      color = "#" + color;
      return color;
    };

    $scope.isShowContent = (data) => {
      if (data === "Instanzknoten") {
        ($scope.showInstanzknoten) ? $scope.showInstanzknoten = false : $scope.showInstanzknoten = true;
        ($scope.showInstanzknoten) ? $scope.showInstanzknotenActive = 'active' : $scope.showInstanzknotenActive = '';
      }

      if (data === "Attributsknoten") {
        ($scope.showAttributsknoten) ? $scope.showAttributsknoten = false : $scope.showAttributsknoten = true;
        ($scope.showAttributsknoten) ? $scope.showAttributsknotenActive = 'active' : $scope.showAttributsknotenActive = '';
      }

      if (data === "Kanten") {
        ($scope.showKanten) ? $scope.showKanten = false : $scope.showKanten = true;
        ($scope.showKanten) ? $scope.showKantenActive = 'active' : $scope.showKantenActive = '';
      }

      if (data === "Physikalische") {
        ($scope.showPhysikalische) ? $scope.showPhysikalische = false : $scope.showPhysikalische = true;
        ($scope.showPhysikalische) ? $scope.showPhysikalischeActive = 'active' : $scope.showPhysikalischeActive = '';
      }
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
    $scope.$on('case-back', () => {
      $state.go('app.cases.view');
    });

    $scope.$on('case-save', () => {
      CaseOntologyDataService.saveCase($scope.data['case']).then(() => {
     });
      this.graphOptions._id = $scope.data.case.identifier;
      GraphDataService.save(this.graphOptions);
      $scope.data['autosetup']._id = $scope.data.case.identifier + 'autosetup';
      GraphDataService.save($scope.data['autosetup']);
    });

    $scope.toggleSidebar = () => {
      $q.when(true).then(() => {
        $mdSidenav('sidebar-tree').toggle();
      });
    };
    //</editor-fold>

    $scope.newInstanceNode = (clazzIri) => {
      const r = Math.floor((Math.random() * 1000) + 1);
      CaseOntologyDataService.createAndAddIndividual(clazzIri, `Node_${r}`, $scope.data['case']).then((individual) => {
        this.data.nodes.add($scope.data['case'].generateNode(individual));
        this.network.fit();
      }).catch((err) => {
        $scope.setError('AddAction', 'add', err);
        $scope.setReady(true);
      });
    };

    $scope.editEdges = () => {
      _showNodeDialog($scope.selectedKnotenNameFull );
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
        console.log(result);
        const individuals = $scope.data['case'].individuals.filter((i) => {
          if (i.iri === $scope.selectedKnotenNameFull) {
            return true;
          }
        });
        if (individuals.length > 0) {

          _renameNode(individuals[0].iri, result).then(() => {
            $scope.setReady(true);
          }).catch((err) => {
            $scope.setError('EditAction', 'mode edit', err);
            $scope.setReady(true);
          });
        }
      });
    };

    $scope.deleteNode = () => {
      $scope.setBusy('Deleting node...');
      const individuals = $scope.data['case'].individuals.filter((i) => {
        if (i.iri === $scope.selectedKnotenNameFull) {
          return true;
        }
      });
      if (individuals.length > 0) {

        this.data.nodes.remove($scope.selectedKnotenNameFull);
        // XXX: removes the individual completely! what should happen if the individual is also in another case?
        CaseOntologyDataService.removeIndividual(individuals[0], $scope.data['case']).then(() => {
          this.network.fit();
          $scope.setReady(true);
        }).catch((err) => {
          $scope.setError('DeleteAction', 'delete', err);
          $scope.setReady(true);
        });
      } else {
        $scope.setReady(true);
      }
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
      Promise.all([
        CaseOntologyDataService.initialize(),
        //GraphDataService.initialize()
      ]).then(() => {
        $scope.data.classesTree = CaseOntologyDataService.getClassTree();
        return Promise.all([
          CaseOntologyDataService.loadCase($state.params.caseId),
          //GraphDataService.loadOptions($state.params.caseId)
        ]);
      }).then((result) => {
        $scope.data['case'] = result[0];
        $scope.data.initialCase = angular.copy(result[0]);
        //$scope.data['graph'] = result[1];
        //$scope.data.initialGraph = angular.copy(result[1]);
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

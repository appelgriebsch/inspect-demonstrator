(function(angular, vis) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $location, $mdSidenav, OntologyDataService, CaseOntologyDataService) {
    const noCaseIdentifier = '_no_case';
    const classIdentifier = '_class_node';
    const dataNodesIdentifier = '_data_node';
    const unconnectedNodeIdentifier = '_unconnected_node';

    this.caseColors = ["#ff420e","#ffd320","#4b1f6f","#cc99ff","#004586"];


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
    let lastSearchedItem = undefined;
    let  cases = [];
    let nodes = [];
    let edges = [];
    let currentFilter = [];
    this.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet(),
    };
    $scope.data = {
      level: 1,
      filters: {},
    };

    //  $scope.physicsEnabled = true;
    this.query = undefined;

    this.searchText = '';
    this.state = $state.$current;

    const _adjustColor = (color, amount) => {
      color = color.slice(1);
      let num = parseInt(color,16);

      let r = (num >> 16) + amount;
      if (r > 255) { r = 255; }
      else if  (r < 0) { r = 0; }

      let b = ((num >> 8) & 0x00FF) + amount;
      if (b > 255) { b = 255; }
      else if (b < 0) { b = 0; }

      let g = (num & 0x0000FF) + amount;
      if (g > 255) { g = 255; }
      else if (g < 0) { g = 0 };

      return "#" + (g | (b << 8) | (r << 16)).toString(16);
    };

    const _createColorOptions = (color) => {
      return  {
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


    const _createSubClassRelation = (parentNode, childNode) => {
      return _createEdge(
        childNode.id,
        parentNode.id,
        `${childNode.label} is a subclass of ${parentNode.label}`,
        { bidirectional: false, type: 'subclass', dashes: true}
      );
    };

    const _createInstanceOfRelation = (typeNode, instanceNode) => {
      return _createEdge(
        instanceNode.id,
        typeNode.id,
        `${instanceNode.label} is of type ${typeNode.label}`,
        { bidirectional: false, type: 'instanceOf', dashes: true}
      );
    };
    const _createObjectRelation = (sourceNode, targetNode, label, bidirectional) => {
      return _createEdge(
        sourceNode.id,
        targetNode.id,
        label,
        { bidirectional: bidirectional, type: 'objectRelation'}
      );
    };
    const _createDataRelation = (sourceNode, targetNode, label, bidirectional) => {
      return _createEdge(
        sourceNode.id,
        targetNode.id,
        label,
        { bidirectional: bidirectional, type: 'dataRelation'}
      );
    };

    const _createEdge = (sourceNodeId, targetNodeId, relation, options) => {
      if  (angular.isUndefined(sourceNodeId) || angular.isUndefined(targetNodeId) || angular.isUndefined(relation))  {
        return;
      }
      if (angular.isUndefined(options)) {
        options = {};
      }
      const setOption = (edge, options, name) => {
        if (!angular.isUndefined(options[name])) {
          edge[name] = options[name];
        }
      };
      const edge = {
        id: `${sourceNodeId}_${relation}_${targetNodeId}`,
        from: sourceNodeId,
        to: targetNodeId,
        title: relation,
        label: relation,
      };
      setOption(edge, options, 'color');
      setOption(edge, options, 'type');
      setOption(edge, options, 'dashes');
      if (options.bidirectional === true) {
        edge.arrows = 'to, from';
      } else {
        edge.arrows = 'to';
      }
      return edge;
    };
    /**
     * Meant to be called just once
     * Prepares the classes/individuals to be used as nodes
     * @private
     */
    const _initializeEdges = (classes, individuals) => {
      const tempNodes = {};
      nodes.forEach((node) => {
        tempNodes[node.id] = node;
      });
      nodes.forEach((node) => {
        if (!angular.isUndefined(tempNodes[node.classIri])) {
          edges.push(_createInstanceOfRelation(tempNodes[node.classIri] , node));
        }
        angular.forEach(node.objectProperties, (propArray, iri) => {
          angular.forEach(propArray, (prop) => {
            if (!angular.isUndefined(tempNodes[prop.target])) {
              edges.push(_createObjectRelation(node, tempNodes[prop.target], prop.label, false));
            }
          });
        });
        angular.forEach(node.datatypeProperties, (propArray, iri) => {
          angular.forEach(propArray, (prop) => {
            const id = `${node.id}_${iri}_${prop.target}`;
            if (!angular.isUndefined(tempNodes[id])) {
              edges.push(_createDataRelation(node, tempNodes[id], prop.label, false));
            }
          });
        });
        angular.forEach(node.childClassIris, (childIri) => {
          if (!angular.isUndefined(tempNodes[childIri])) {
            edges.push(_createSubClassRelation(node, tempNodes[childIri]));
          }

        });
        // instanceOf relation
        //_addInstanceOfRelation();
        // datatypeProperties
        //objectProperties
      });
    };
    /**
     * Meant to be called just once
     * Prepares the classes/individuals to be used as nodes
     * @private
     */
    const _initializeNodes =(classes, individuals) => {
      classes.map((clazz) => {
        clazz.group = classIdentifier;
        clazz.filterLabels = [classIdentifier];
        clazz.title = clazz.label;
        clazz.id = clazz.iri;
      });
      // filter out the case nodes
      individuals = individuals.filter((individual) => {
        return !CaseOntologyDataService.isCase(individual);
      });
      individuals.map((individual) => {
        individual.filterLabels = [];
        angular.forEach(cases, (c) => {
          const found = c.individuals.find((i) => {
            return i.iri === individual.iri;
          });
          if (!angular.isUndefined(found)) {
            individual.filterLabels.push(c.identifier);
          }
        });
        if (individual.filterLabels.length === 0) {
          individual.group = noCaseIdentifier;
        } else {
          // XXX: multiple cases not supported yet!
          individual.group = individual.filterLabels[0];
        }
        individual.title = `${individual.label} of type ${individual.classIri.replace(OntologyDataService.ontologyIri(),'')}`;
        individual.id = individual.iri;

        angular.forEach(individual.datatypeProperties, (propArray, iri) => {
          angular.forEach(propArray, (prop) => {
            nodes.push({
              id: `${individual.id}_${iri}_${prop.target}`,
              group: dataNodesIdentifier,
              title: prop.target,
              label: prop.target,
              filterLabels: [dataNodesIdentifier],
            });
          });
        });
      });
      nodes = nodes.concat(classes);
      nodes = nodes.concat(individuals);

      // XXX: as long as saving datatype properties isn't fixed filter duplicates
      nodes = nodes.filter(function(node, index, self) {
        return index === self.indexOf(node);
      });
    };

    const _createNodeWithNeighborhood = (node, level) => {
      if (level === 0) {
          return [node];
      }
      let neighbors = [];
      edges.forEach((e) => {
        if (e.from === node.id || e.to === node.id) {
          if (e.from !== node.id) {
            const neighbor = nodes.find((n) => {
              return n.id === e.from;
            });
            if (currentFilter[neighbor.group] === true) {
              neighbors = neighbors.concat(_createNodeWithNeighborhood(neighbor, level - 1));
            }
          }
          if (e.to !== node.id) {
            const neighbor = nodes.find((n) => {
              return n.id === e.to;
            });
            if (currentFilter[neighbor.group] === true) {
              neighbors = neighbors.concat(_createNodeWithNeighborhood(neighbor, level - 1));
            }
          }
        }
      });
      return neighbors;
    };

    const _createNodes = () => {
      return nodes.filter((node) => {
        return ((this.data.nodes.get(node.id) === null)
        && currentFilter[node.group]
        // filter out classes with no connections to individuals
        && !(node.group === classIdentifier && node.individualIris.length === 0));
      });
    };
    const _createEdges = () => {
      return edges;
    };

    const _createGraph = (classes, individuals) => {
      const container = document.getElementById('ontology-graph');

      _initializeNodes(classes, individuals);
      _initializeEdges(classes, individuals);
      this.network = new vis.Network(container, this.data, this.graphOptions);
      this.data.nodes.add(_createNodes());
      this.data.edges.add(_createEdges());

      // when a node is selected all incoming and outgoing edges of that node
      // are selected too, that's why this event is used for displaying the
      // meta data of a selected item
      this.network.on('select', (params) => {
        if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
          const selectedNodeId = params.nodes[0];
          $scope.$broadcast('nodeSelectedEvent', this.data.nodes.get(selectedNodeId));
        }
        /*if ((params.edges !== undefined) && (params.edges.length > 0)) {
         var selectedEdgeId = params.edges[0];
         this.selectedNode = this.data.edges.get(selectedEdgeId);

         }*/
      });
      this.network.fit();
    };

    const _resetFilters = () => {
      const filter = [ {
        id: classIdentifier,
        label: 'Classes',
        color: this.graphOptions.groups[classIdentifier].color.background,
        checked: false
      }, /* TODO: implement multiple filtering
       {
       id: unconnectedNodeIdentifier,
       label: 'Nodes without Edges',
       checked: true
       },*/{
        id: dataNodesIdentifier,
        label: 'Data Nodes',
        color: this.graphOptions.groups[dataNodesIdentifier].color.background,
        checked: true
      }, {
        id: noCaseIdentifier,
        label: 'Nodes without Cases',
        color: this.graphOptions.groups[noCaseIdentifier].color.background,
        checked: true
      }];
      angular.forEach((cases), (c) => {
        filter.push({
          id: c.identifier,
          label: c.name,
          color: this.graphOptions.groups[c.identifier].color.background,
          checked: true
        });
      });
      angular.forEach(filter, (f) => {
        currentFilter[f.id] = f.checked;
      });
      return filter;
    };

    this.initialize = function() {
      $scope.setBusy('Loading ontology data...');
      const promises = [];
      if (OntologyDataService.isInitialized()) {
        promises.push(Promise.resolve());
      } else {
        promises.push(OntologyDataService.initialize());
        //  promises.push(Promise.resolve());
      }
      promises.push(CaseOntologyDataService.initialize());
      Promise.all(promises).then(() => {
        return Promise.all([
          OntologyDataService.fetchAllClasses(true),
          OntologyDataService.fetchAllInstances(true),
          CaseOntologyDataService.loadCases(),
        ]);
      }).then((result) => {
        let classes = result[0];
        let individuals = result[1];
        cases = result[2];

        this.graphOptions.groups = {};
        this.graphOptions.groups[noCaseIdentifier] = _createColorOptions("#579d1c");
        this.graphOptions.groups[classIdentifier] = _createColorOptions("#3399ff");
        this.graphOptions.groups[dataNodesIdentifier] = {
          shape: 'box',
          color: {
            border: '#aa80ff',//'#2B7CE9',
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
        };
        angular.forEach((cases), (c,v) => {
          this.graphOptions.groups[c.identifier] = _createColorOptions(this.caseColors[v % this.caseColors.length]);
        });
        $scope.$broadcast('filtersCreatedEvent', _resetFilters());
        $scope.setBusy('Creating ontology graph...');
        return _createGraph(classes, individuals);
      }).then(() => {

        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    this.findTerm = (searchText) => {
      return nodes.filter((node) => {
        if (typeof node.label ===  "string"){
          return node.label.search(new RegExp(searchText, 'i')) > -1;
        }
      });
    };

    this.search = () => {
      const iri = this.query ? this.query.iri : '';

      if (iri.length > 0) {
        this.data.nodes.clear();
        this.data.edges.clear();
        lastSearchedItem = iri;

      /*  const node = nodes.find((n) => {
          return n.id === iri;
        });
        const that = this;
        const newNodes = _createNodeWithNeighborhood(node, 1).filter(function(node, index, self) {
          return index === self.indexOf(node) &&  that.data.nodes.get(node.id) === null;
        });
        this.data.nodes.add(newNodes);
        const newEdges =  _createEdges().filter(function(edge, index, self) {
          return index === self.indexOf(edge) && that.data.edges.get(edge.id) === null;
        });

        this.data.edges.add(newEdges);

        this.data.edges.add(newEdges);*/
        this.network.fit();
      } else {
        this.reset();
      }
    };

    this.reset = () => {
      $q.when(true).then(() => {
        this.query = '';
        this.data.nodes.clear();
        this.data.edges.clear();

      });
    };
    this.toggleSidebar = function(id) {
      $q.when(true).then(() => {
        $mdSidenav(id).toggle();
      });
    };

    /** events from sidebar controller **/
    $scope.$on('nodeFocusedEvent', (event, data) => {
      $scope.physicsOnOffData = this.network.physics.physicsEnabled;
      this.data.nodes.clear();
      this.data.edges.clear();

      this.data.nodes.add(data.node);
      this.network.focus(data.node);
      this.network.fit();
    });
    $scope.$on('nodeFocusReleasedEvent', (event) => {
      this.network.releaseNode();
    });
    $scope.$on('nextLevelEvent', (event, data) => {
      //_loadIndividualNode (data.node.id, $scope.data.level - 1);
      // filter out the nodes not shown by filters
      const that = this;
      const newNodes = _createNodeWithNeighborhood(data.node, data.level).filter(function(node, index, self) {
        return index === self.indexOf(node) && node.id !== data.node.id && that.data.nodes.get(node.id) === null;
      });
      this.data.nodes.add(newNodes);
      const newEdges =  _createEdges().filter(function(edge, index, self) {
        return index === self.indexOf(edge) && that.data.edges.get(edge.id) === null;
      });

      this.data.edges.add(newEdges);
    });
    $scope.$on('colorChangeEvent', (event, data) => {
      this.graphOptions.groups[data.id] = _createColorOptions(data.color);
      this.network.setOptions(this.graphOptions);
    });
    $scope.$on('hideNodeEvent', (event, data) => {
      this.data.nodes.remove(data.node);
    });
    $scope.$on('resetGraphEvent', (event) => {
      this.data.nodes.clear();
      this.data.edges.clear();
      $scope.$broadcast('filtersCreatedEvent', _resetFilters());
      this.data.nodes.add(_createNodes());
      this.data.edges.add(_createEdges());
    });
    $scope.$on('showNodeGroupEvent', (event, data) => {
      currentFilter[data.id] = true;
      this.data.nodes.add(_createNodes());
    });
    $scope.$on('hideNodeGroupEvent', (event, data) => {
      currentFilter[data.id] = false;
      this.data.nodes.remove(this.data.nodes.get({
        filter: (node) => {
          return !currentFilter[node.group];
        }
      }));
    });
  }

  module.exports = OntologyViewController;

})(global.angular, global.vis);

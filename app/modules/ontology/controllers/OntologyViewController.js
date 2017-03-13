(function(angular, vis) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $location, $mdSidenav, OntologyDataService, CaseOntologyDataService) {

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
        classNode: {

        },
        instanceNode: {
          color: {
            border: '#194d19',//'#2B7CE9',
            background: '#339933',//'#97C2FC',
            highlight: {
              border: '#40bf40',
              background: '#66cc66'
            },
            hover: {
              border: '#40bf40',
              background: '#66cc66'
            },
          },
        },
        dataNode: {
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
      lastSearchedItem: undefined,
      classes: [],

    };
    $scope.data = {
      selectedNode: {},
      focusedNode: {},
      level: 1,
    };

    $scope.physicsEnabled = true;
    this.query = undefined;

    this.searchText = '';
    this.state = $state.$current;


    const _addSubClassRelation = (parentClass, childClass) => {
      _addRelation(
        parentClass,
        childClass,
        `${childClass.label} is a subclass of ${parentClass.label}`,
        { bidirectional: false, type: 'subclass', dashes: true}
      );
    };

    const _addInstanceOfRelation = (clazz, instance) => {
      _addRelation(
        clazz,
        instance,
        `${instance.label} is of type ${clazz.label}`,
        { bidirectional: false, type: 'instanceOf'}
      );
    };

    const _addRelation = (item1, item2, relation, options) => {
      if  (angular.isUndefined(_addNode(item1)) || angular.isUndefined(_addNode(item2)))  {
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
      const edgeId = `${item1.id}_${relation}_${item2.id}`;
      if (this.data.edges.get(edgeId)) {
        return;
      }
      const edge = {
        id: edgeId,
        from: item1.id,
        to: item2.id,
        title: relation,
      };
      setOption(edge, options, 'color');
      setOption(edge, options, 'type');
      setOption(edge, options, 'dashes');
      if (options.bidirectional === true) {
       edge.arrows = 'to, from';
      } else {
        edge.arrows = 'to';
      }
      this.data.edges.add(edge);
    };

    const _addNode = (item) => {
      if (angular.isUndefined(item) || (item === null )) {
        return;
      }
      if (!angular.isUndefined(item.iri) && this.data.nodes.get(item.iri)) {
        return item.iri;
      }
      if (!angular.isUndefined(item.id) && this.data.nodes.get(item.id)) {
        return item.id;
      }
      if (OntologyDataService.isClass(item)){
        item.group = 'classNode';
        item.title = item.label;
        item.id = item.iri;
      } else if (OntologyDataService.isIndividual(item)){
        item.group = 'instanceNode';
        item.title = `${item.label} of type ${item.classIri.replace(OntologyDataService.ontologyIri(),'')}`;
        item.id = item.iri;
      }  else {
        item.group = 'dataNode';
        item.title = item.label;
      }
      this.data.nodes.add(item);
      return item.id;
    };

    const _loadClassNode = (iri) => {
      OntologyDataService.fetchClass(iri, true).then((result) => {
        const promises = [ Promise.resolve(result) ];

        // child classes
        promises.push(Promise.all(result.childClassIris.reduce((accumulator, iri) => {
          accumulator.push(OntologyDataService.fetchClass(iri, true));
          return accumulator;
        }, [])));

        // parent classes
        promises.push(Promise.all(result.parentClassIris.reduce((accumulator, iri) => {
          accumulator.push(OntologyDataService.fetchClass(iri, true));
          return accumulator;
        }, [])));

        // individuals
        promises.push(Promise.all(result.individualIris.reduce((accumulator, iri) => {
          accumulator.push(OntologyDataService.fetchIndividual(iri, false));
          return accumulator;
        }, [])));

        //object relations
        promises.push(Promise.all(result.objectPropertyIris.reduce((accumulator, iri) => {
          accumulator.push(OntologyDataService.fetchObjectProperty(iri, true));
          return accumulator;
        }, [])));
        return Promise.all(promises);
      }).then((result) => {
        const clazz = result.splice(0, 1)[0];
        _addNode(clazz);

        result.splice(0, 1)[0].forEach((childClass) => {
          _addSubClassRelation(clazz, childClass);
        });

        result.splice(0, 1)[0].forEach((parentClass) => {
          _addSubClassRelation(parentClass, clazz);
        });

        result.splice(0, 1)[0].forEach((individual) => {
          _addInstanceOfRelation(clazz, individual);
        });

     /*   result.splice(0, 1)[0].forEach((objectProperty) => {
         _addObjectRelation(clazz, objectProperty);
        });*/
        this.network.fit();
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });

    };

    const _addObjectRelations = (individuals) => {
      const that = this;
      angular.forEach(individuals, (individual) => {
        angular.forEach(individual.objectProperties, (value) => {
          angular.forEach(value, function(v) {
            _addRelation(
              that.data.nodes.get(individual.iri),
              that.data.nodes.get(v.target),
              v.label
            );
          });
        });
      });
    };
    const _addDataRelations = (individuals) => {
      const that = this;
      angular.forEach(individuals, (individual) => {
        angular.forEach(individual.datatypeProperties, (value) => {
          angular.forEach(value, function(v) {
            _addRelation(
              that.data.nodes.get(individual.iri),
              that.data.nodes.get(_addNode({id: `${individual.iri}_label_${v.target}`, label: v.target})),
              v.label
            );
          });
        });
      });
    };

    const _loadIndividualNode = (iri, level) => {
      if (angular.isUndefined(iri)) {
        return;
      }
      const promises = [];
      const individual = this.data.nodes.get(iri);
      if (!angular.isUndefined(individual)) {
        _addDataRelations([individual]);
        angular.forEach(individual.objectProperties, function(propIri) {
          angular.forEach(propIri, function(v) {
            promises.push(OntologyDataService.fetchIndividual(v.target, true));
          });
        });
      }
      Promise.all(promises).then((result) => {
        angular.forEach(result, (item) => {
          _addNode(item);
        });
        result.push(individual);
        _addObjectRelations(result);
        if (level > 0) {
          angular.forEach(result, (item) => {
            _loadIndividualNode(item.iri, level - 1);
          });
        }
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });



    };
    const _loadIndividualNodes = () => {
      OntologyDataService.fetchAllInstances(true).then((result) => {
        angular.forEach(result, (individual) => {
          _addNode(individual);
          individual.expanded = true;
        });
        _addObjectRelations(result);
        _addDataRelations(result);

        this.network.fit();
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    /*
     const _loadIndividualNodes = (iri, level) => {
     OntologyDataService.fetchAllInstances(true).then((result) => {
     result.forEach((individual) => {
     //  console.log(individual);
     _addNode(individual, 'instanceNode');
     });
     const that = this;
     result.forEach((individual) => {
     angular.forEach(individual.objectProperties, function(value, key) {
     angular.forEach(value, function(v) {
     _addRelation(
     that.data.nodes.get(individual.iri),
     that.data.nodes.get(v.target),
     v.label
     );
     });
     });
     });
     result.forEach((individual) => {
     angular.forEach(individual.datatypeProperties, function(value, key) {
     angular.forEach(value, function(v) {
     _addRelation(
     that.data.nodes.get(individual.iri),
     that.data.nodes.get(_addNode({label: v.target})),
     v.label
     );
     });
     });
     });
     this.network.fit();
     }).catch((err) => {
     $scope.setError('SearchAction', 'search', err);
     $scope.setReady(true);
     });
     };
     */


    var _createGraph = () => {

      var container = document.getElementById('ontology-graph');
      this.network = new vis.Network(container, this.data, this.graphOptions);

      // when a node is selected all incoming and outgoing edges of that node
      // are selected too, that's why this event is used for displaying the
      // meta data of a selected item
      this.network.on('select', (params) => {
        if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
          var selectedNodeId = params.nodes[0];


          $scope.data.selectedNode =  this.data.nodes.get(selectedNodeId);
          $scope.$apply();
          return;
        }
        /*if ((params.edges !== undefined) && (params.edges.length > 0)) {
          var selectedEdgeId = params.edges[0];
          this.selectedNode = this.data.edges.get(selectedEdgeId);

        }*/
      });
    };

    var _activateMode = (mode) => {

      this.reset();

      if (mode) {
        $scope.setModeLabel('Incidents');
        if (this.network) {
          this.network.removeAllListeners('selectNode');
          _loadIndividualNodes();
        }
      } else {
        $scope.setModeLabel('Model');
        if (this.network) {
          /*this.network.on('selectNode', (params) => {
            var selectedNodeId = params.nodes[0];
            var selectedNode = this.data.nodes.get(selectedNodeId);
            _loadClassNode(selectedNode.identifier);
          });*/
          if (!angular.isUndefined(this.data.lastSearchedItem)) {
            _loadClassNode(this.data.lastSearchedItem);
          }
        }
      }
    };

    this.initialize = function() {

      $scope.setBusy('Loading ontology data...');
      const promises = [];
      if (OntologyDataService.isInitialized()) {
        promises.push(Promise.resolve());
      } else {
        promises.push(OntologyDataService.initialize());
      }
      promises.push(CaseOntologyDataService.initialize());
      Promise.all(promises).then(() => {
        return Promise.all([
           OntologyDataService.fetchAllClasses(),
        ]);
      }).then((result) => {
        this.data.classes = result[0];
        _createGraph();
        _activateMode();
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    this.findTerm = (searchText) => {
      return this.data.classes.filter((clazz) => {
        return clazz.label.search(new RegExp(searchText, 'i')) > -1;
      });
    };

    this.search = () => {
      const iri = this.query ? this.query.iri : '';

      if (iri.length > 0) {
        this.data.nodes.clear();
        this.data.edges.clear();
        this.data.lastSearchedItem = iri;
        _loadClassNode(iri);
        this.network.fit();
      } else {
        this.reset();
      }
    };

    this.reset = () => {
      $q.when(true).then(() => {
        this.query = '';
        $scope.data.selectedNode = undefined;
        $scope.data.focusedNode = undefined;
        this.data.nodes.clear();
        this.data.edges.clear();

      });
    };
    this.toggleSidebar = function(id) {
      $q.when(true).then(() => {
          $mdSidenav(id).toggle();
      });
    };

    $scope.isEnabled = (data) => {
      if (data === 'nextLevel') {
        return angular.isUndefined($scope.data.focusedNode);
      }
      if (data === 'setFocus') {
        return angular.isUndefined($scope.data.selectedNode);
      }
      if (data === 'clearFocus') {
        return angular.isUndefined($scope.data.focusedNode);
      }
      if (data === 'fadeOut') {

        return angular.isUndefined($scope.data.selectedNode);
      }
    };


    $scope.$on('mode-changed', (evt, mode) => {
      _activateMode(mode);
    });


    $scope.setFocus = () => {
      if (angular.isUndefined($scope.data.selectedNode)) {
        return;
      }
      $scope.physicsOnOffData = this.network.physics.physicsEnabled;
      this.data.nodes.clear();
      this.data.edges.clear();

      this.data.nodes.add($scope.data.selectedNode);
      $scope.data.focusedNode = $scope.data.selectedNode;
      this.network.fit();

    };
    $scope.clearFocus = () => {
      $scope.data.focusedNode = undefined;
      this.network.releaseNode();
    };
    $scope.resetGraph = () => {
      this.reset();
      $scope.data.selectedNode = undefined;
      $scope.data.focusedNode = undefined;
      _loadIndividualNodes();
    };
    $scope.nextLevel = () => {
      _loadIndividualNode ($scope.data.selectedNode.id, $scope.data.level - 1);
      //this.network.moveNode($scope.data.focusedNode.id, 0, 0);
      this.network.focus($scope.data.focusedNode.id);
    };
    $scope.fadeOut = () => {
      this.data.nodes.remove($scope.data.selectedNode);
      $scope.data.selectedNode = undefined;
    };


    $scope.physicsOnOff = () => {
      if ($scope.physicsEnabled === true) {
        this.network.physics.enabled = true;
      } else {
        this.network.physics.enabled = false;
      }
    };
  }

  module.exports = OntologyViewController;

})(global.angular, global.vis);

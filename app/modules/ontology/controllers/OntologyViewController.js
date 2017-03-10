(function(angular, vis) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $location, $mdSidenav, OntologyDataService) {

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
      classes2: {}
    };
    this.query = undefined;
    this.selectedElement = undefined;
    this.visibleInstances = [];

    this.searchText = '';

    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    const _findNode = (identifier) => {

      return this.data.nodes.get({
        filter: function(item) {
          return item.identifier === identifier;
        }
      });
    };

    const _createNode = (identifier, options) => {

      var node = _findNode(identifier);

      if (node.length == 0) {

        var label = OntologyDataService.labelForNode(identifier);
        var newNode = {
          id: this.data.nodes.length + 1,
          identifier: identifier,
          label: label,
          title: identifier
        };

        if ((options) && (options.color)) {
          newNode.color = options.color;
        }

        if ((options) && (options.value)) {
          newNode.value = options.value;
        }

        if ((options) && (options.comment)) {
          newNode.title = options.comment;
        }

        this.data.nodes.add(newNode);
        node = _findNode(identifier);
      }


      return node[0];
    };

    const _findEdge = (from, to, identifier) => {

      return this.data.edges.get({
        filter: function(item) {
          return ((item.from == from.id) && (item.to == to.id) && (item.identifier === identifier));
        }
      });
    };

    const _hasProperties = (object) => {

      var props = this.ontology.properties.find((elem) => {
        return (elem.domain === object) || (elem.range === object);
      });

      return (props !== undefined);
    };

    var _createGraphItems = (subject, object, predicate) => {

      var subjNode = _findNode(subject);
      var objNode = _findNode(object);
      var relation = predicate;

      var from = subjNode ? subjNode[0] : undefined;
      var to = objNode ? objNode[0] : undefined;

      var label = OntologyDataService.labelForEdge(relation);

      var newEdge = {
        identifier: relation,
        title: label
      };

      var optionsFrom = {};
      var optionsTo = {};

      if (label === 'property') { // replace domain and range relationships with related objects

        to = _createNode(object, optionsTo);

        var prop = this.ontology.properties.find((elem) => {
          return (elem.property === subject) && ((elem.domain === object) || (elem.range === object));
        });

        if (!prop) {
          from = _createNode(subject, optionsFrom);
        } else {

          newEdge.label = newEdge.title = OntologyDataService.labelForEdge(prop.property);
          newEdge.font = { align: 'top' };
          relation = newEdge.identifier = prop.property;

          if (to.identifier === prop.domain) {
            from = _createNode(prop.range, optionsFrom);
          } else if (to.identifier === prop.range) {
            from = _createNode(prop.domain, optionsFrom);
          }
        }

        // check if reverse edge exists already
        var reverseEdge = _findEdge(to, from, relation);
        if (reverseEdge.length > 0) {
          newEdge = undefined;
        }

      } else if (label === 'comment') {
        from = _createNode(subject, optionsFrom);
        this.data.nodes.update({ id: from.id, title: object });
        newEdge = undefined;
      } else if (label === 'internal') {
        newEdge = undefined;
      } else {

        if (label === 'isA') { // layout updates for sub class relationships

          newEdge.arrows = {
            to: {
              scaleFactor: 0.5
            }
          };

          newEdge.data.classIrises = true;
          newEdge.color = '#b6c9de';

          if (!_hasProperties(subject)) {
            optionsFrom.color = "#8585ad";
            optionsFrom.value = 6;
            this.visibleInstances.push( OntologyDataService.labelForNode(subject));
          }

          if (!_hasProperties(object)) {
            optionsTo.color = newEdge.color;
            optionsTo.value = 10;
          }

        } else {
          newEdge.label = newEdge.title = OntologyDataService.labelForEdge(predicate);
          newEdge.font = { align: 'top' };
        }

        from = _createNode(subject, optionsFrom);
        to = _createNode(object, optionsTo);
      }

      if (newEdge) {

        var edge = _findEdge(from, to, relation);

        if (edge.length == 0) {
          newEdge.from = from.id;
          newEdge.to = to.id;
          this.data.edges.add(newEdge);
          edge = _findEdge(from, to, relation);
        }

        return edge[0];
      }

      return undefined;
    };

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

    const _addInstanceRelation = (instance1, instance2, relation) => {
      if (angular.isUndefined(instance1)) {
        throw Error('Instance1 must not be null!');
      }
      if (angular.isUndefined(instance)) {
        throw Error('Instanc2e must not be null!');
      }
      if (!this.data.nodes.get(instance1.iri)) {
        _addNode(instance1, 'instanceNode');
      }
      if (!this.data.nodes.get(instance2.iri)) {
        _addNode(instance2, 'instanceNode');
      }
      this.data.edges.add({
        from: instance1.iri,
        to: instance2.iri,
        title: relation,
      });

    };


    const _addObjectRelation = (clazz, objectProperty) => {
      /*_addRelation(
        clazz,
        instance,
        `${instance.label} is of type ${clazz.label}`,
        { bidirectional: false, type: 'instanceOf'}
      );*/

      if (angular.isUndefined(clazz)) {
        throw Error('Class must not be null!');
      }
      if (!OntologyDataService.isClass(clazz)) {
        throw Error('First parameter must be a class object!');
      }
      if (angular.isUndefined(objectProperty)) {
        throw Error('ObjectProperty must not be null!');
      }
      if (!OntologyDataService.isObjectProperty(objectProperty)) {
        throw Error('Second parameter must be an object property object!');
      }

      if(objectProperty.domainIris.indexOf(clazz.iri) > -1) {
        objectProperty.rangeIris.forEach((iri) => {
         /* _addRelation(
            clazz,
            instance,
            `${instance.label} is of type ${clazz.label}`,
            { bidirectional: false, type: 'instanceOf'}
          );*/

          //TODO: change to display label!!
          _addNode({iri: iri, label: iri}, 'classNode');
          this.data.edges.add({
            from: clazz.iri,
            to: iri,
            title: objectProperty.label,
          });
        });
      }
      if(objectProperty.rangeIris.indexOf(clazz.iri) > -1) {
        objectProperty.domainIris.forEach((iri) => {
          //TODO: change to display label!!
          _addNode({iri: iri, label: iri}, 'classNode');
          this.data.edges.add({
            to: clazz.iri,
            from: iri,
            title: objectProperty.label,
          });
        });
      }
    };

    const _addRelation = (item1, item2, relation, options) => {
      _addNode(item1);
      _addNode(item2);
      if (angular.isUndefined(options)) {
        options = {};
      }
      const setOption = (edge, options, name) => {
        if (!angular.isUndefined(options[name])) {
          edge[name] = options[name];
        }
      };
      const edge = {
        to: item1.iri,
        from: item2.iri,
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
      if (angular.isUndefined(item)) {
        throw Error('Item must not be null!');
      }
      if (this.data.nodes.get(item.iri)) {
        return;
      }
      if (OntologyDataService.isClass(item)){
        item.group = 'classNode';
      } else if (OntologyDataService.isIndividual(item)){
        item.group = 'instanceNode';
      }
      item.title = item.label;
      item.id = item.iri;
      this.data.nodes.add(item);
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
    const _loadInstanceNodes = () => {
      OntologyDataService.fetchAllInstances(true).then((result) => {
        result.forEach((individual) => {
          console.log(individual);
          _addNode(individual, 'instanceNode');
        });
        result.forEach((individual) => {
        // _addNode(individual, 'instanceNode');
        });



        /*const promises = [ Promise.resolve(result) ];

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

        result.splice(0, 1)[0].forEach((childClass) => {
          _addSubClassRelation(clazz, childClass);
        });

        result.splice(0, 1)[0].forEach((parentClass) => {
          _addSubClassRelation(parentClass, clazz);
        });

        result.splice(0, 1)[0].forEach((individual) => {
          _addInstanceRelation(clazz, individual);
        });

        result.splice(0, 1)[0].forEach((objectProperty) => {
          _addObjectRelation(clazz, objectProperty);
        });
        this.network.fit();*/
      })/*.catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });*/

    };

  /*  var _loadInstanceNodes = () => {
      $q.when(true).then(() => {
        this.ontology.instances.forEach((instance) => {
          if (instance.object) {
            _createGraphItems(instance.subject, instance.object, instance.predicate);
          }
        });
        this.network.fit();
      });
    };*/

    var _createGraph = () => {

      var container = document.getElementById('ontology-graph');
      this.network = new vis.Network(container, this.data, this.graphOptions);

      // when a node is selected all incoming and outgoing edges of that node
      // are selected too, that's why this event is used for displaying the
      // meta data of a selected item
      this.network.on('select', (params) => {
        if ((params.nodes !== undefined) && (params.nodes.length > 0)) {
          var selectedNodeId = params.nodes[0];
          this.selectedElement =  this.data.nodes.get(selectedNodeId);
          return;
        }
        if ((params.edges !== undefined) && (params.edges.length > 0)) {
          var selectedEdgeId = params.edges[0];
          this.selectedElement = this.data.edges.get(selectedEdgeId);

        }
      });
    };

    var _activateMode = (mode) => {

      this.reset();

      if (mode) {
        $scope.setModeLabel('Incidents');
        if (this.network) {
          this.network.removeAllListeners('selectNode');
          _loadInstanceNodes();
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
      let promise;
      if (OntologyDataService.isInitialized()) {
        promise = Promise.resolve();
      } else {
        promise = OntologyDataService.initialize();
      }
      promise.then(() => {
        return Promise.all([
          OntologyDataService.fetchAllClasses()
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
        this.selectedElement = undefined;
        this.visibleInstances = [];
        this.data.nodes.clear();
        this.data.edges.clear();

      });
    };
    this.toggleSidebar = function(id) {
      $q.when(true).then(() => {
          $mdSidenav(id).toggle();
      });
    };


    $scope.$on('mode-changed', (evt, mode) => {
      _activateMode(mode);
    });
  }

  module.exports = OntologyViewController;

})(global.angular, global.vis);

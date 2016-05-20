(function(angular, vis) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $mdDialog, OntologyDataService) {

    this.graphOptions = {
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
      interaction: {
        hover: true,
        hoverConnectedEdges: false,
        selectConnectedEdges: true
      }
    };

    this.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet()
    };

    this.network = undefined;
    this.query = undefined;
    this.searchText = '';
    this.baseURI = '';
    this.classes = [];
    this.properties = [];
    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    var _findNode = (identifier) => {

      return this.data.nodes.get({
        filter: function(item) {
          return item.identifier === identifier;
        }
      });
    };

    var _createNode = (identifier, options) => {

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

        this.data.nodes.add(newNode);
        node = _findNode(identifier);
      }


      return node[0];
    };

    var _findEdge = (from, to, identifier) => {

      return this.data.edges.get({
        filter: function(item) {
          return ((item.from == from.id) && (item.to == to.id) && (item.identifier === identifier));
        }
      });
    };

    var _hasProperties = (object) => {

      var props = this.properties.find((elem) => {
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

        var prop = this.properties.find((elem) => {
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

      } else {

        if (label === 'isA') { // layout updates for sub class relationships

          newEdge.arrows = {
            to: {
              scaleFactor: 0.5
            }
          };

          newEdge.dashes = true;
          newEdge.color = '#b6c9de';

          if (!_hasProperties(subject)) {
            optionsFrom.color = newEdge.color;
            optionsFrom.value = 10;
          }

          if (!_hasProperties(object)) {
            optionsTo.color = newEdge.color;
            optionsTo.value = 10;
          }
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

    var _loadNode = (nodeLabel) => {

      var queryString = nodeLabel.startsWith('http://') ? nodeLabel : `${this.baseURI}#${nodeLabel}`;
      var owlURI = OntologyDataService.uriForPrefix('owl');

      OntologyDataService.node(queryString)
        .then((results) => {
          $q.when(true).then(() => {
            results.forEach((item) => {

              if (!item.object.startsWith(owlURI)) {
                _createGraphItems(item.subject, item.object, item.predicate);
              }
            });

            var mainNode = _findNode(queryString);
            this.network.selectNodes([mainNode[0].id], true);
            this.network.fit();
          });
        });
    };

    var _createGraph = () => {

      var container = document.getElementById('ontology-graph');
      this.network = new vis.Network(container, this.data, this.graphOptions);

      this.network.on('selectNode', (params) => {
        var selectedNodeId = params.nodes[0];
        var selectedNode = this.data.nodes.get(selectedNodeId);
        _loadNode(selectedNode.identifier);
      });
    };

    this.initialize = function() {

      $scope.setBusy('Loading ontology data...');

      _createGraph();
      var init = [OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        return OntologyDataService.ontology();
      }).then((result) => {
        this.baseURI = result;
        return OntologyDataService.classes();
      }).then((result) => {
        this.classes = result;
        return OntologyDataService.properties();
      }).then((result => {
        this.properties = result;
        $scope.setReady(false);
      })).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    this.findTerm = (searchText) => {

      var foundNodes = [];
      this.classes.forEach((entry) => {
        var idx = entry.label.search(new RegExp(searchText, 'i'));
        if (idx != -1) {
          foundNodes.push(entry);
        }
      });

      return foundNodes;
    };

    this.search = () => {

      var identifier = this.query ? this.query.identifier : '';

      if (identifier.length > 0) {
        _loadNode(identifier);
      } else {
        this.reset();
      }

      return;
    };

    this.reset = () => {
      $q.when(true).then(() => {
        this.query = '';
        this.data.nodes.clear();
        this.data.edges.clear();
        this.network.destroy();
        _createGraph();
      });
    };

  }

  module.exports = OntologyViewController;

})(global.angular, global.vis);

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
    this.ontology = undefined;
    this.selectedElement = undefined;
    this.searchText = '';
    this.sidebarOpened = false;

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

        if ((options) && (options.comment)) {
          newNode.title = options.comment;
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
        console.log(subject, predicate, object);
        newEdge = undefined;
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

      var queryString = nodeLabel.startsWith('http://') ? nodeLabel : `${this.ontology.uri}${nodeLabel}`;
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
            this.selectedElement = mainNode[0];
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
          return;
        }

      });

    };

    var _activateMode = (mode) => {
      if (mode) {
        $scope.setModeLabel('Incidents');
      } else {
        $scope.setModeLabel('Model');
      }
      this.reset();
    };

    this.initialize = function() {

      $scope.setBusy('Loading ontology data...');

      _createGraph();
      _activateMode($scope.getActiveMode());

      var init = [OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        return OntologyDataService.ontology();
      }).then((result) => {
        this.ontology = result;
        $scope.setReady(false);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

    this.findTerm = (searchText) => {

      var foundNodes = [];
      this.ontology.classes.forEach((entry) => {
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
        this.searchText = '';
        this.selectedElement = undefined;
        this.data.nodes.clear();
        this.data.edges.clear();
        this.network.destroy();
        _createGraph();
      });
    };

    this.openSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).addClass('sidebar-open');
        this.sidebarOpened = true;
      });
    };

    this.closeSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).removeClass('sidebar-open');
        this.sidebarOpened = false;
      });
    };

    $scope.$on('mode-changed', (evt, mode) => {
      _activateMode(mode);
    });
  }

  module.exports = OntologyViewController;

})(global.angular, global.vis);

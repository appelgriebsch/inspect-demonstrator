(function(angular, vis) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $mdDialog, OntologyDataService) {

    this.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet()
    };

    this.network = undefined;

    this.nodes = [];
    this.query = '';

    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    var _findNode = (nodeLabel) => {

      return this.nodes.find((node) => {
        return node.label === nodeLabel;
      });
    };

    var _createNode = (nodeLabel) => {

      var node = {
        id: this.nodes.length + 1,
        label: nodeLabel,
        isNew: true
      };

      this.nodes.push(node);
      return node;
    };

    var _loadNode = (nodeLabel) => {

      var queryString = nodeLabel.startsWith('http://') ? nodeLabel : `http://www.AMSL/GDK/ontologie#${nodeLabel}`;
      OntologyDataService.node(queryString)
       .then((results) => {
         $q.when(true).then(() => {
           results.map((item) => {

             var subjNode = _findNode(item.subject) || _createNode(item.subject);
             var objNode = _findNode(item.object) || _createNode(item.object);

             var edge = {
               from: subjNode.id,
               to: objNode.id,
               label: item.predicate
             };

             if (subjNode.isNew) {
               delete subjNode.isNew;
               this.data.nodes.add(subjNode);
             }

             if (objNode.isNew) {
               delete objNode.isNew;
               this.data.nodes.add(objNode);
             }

             this.data.edges.add(edge);
           });

           this.network.setData(this.data);
         });
       });
    };

    var _createGraph = () => {

      var container = document.getElementById('ontology-graph');
      this.network = new vis.Network(container, { }, { });

      this.network.on('selectNode', (params) => {
        var selectedNodeId = params.nodes[0];
        var selectedNode = this.data.nodes.get(selectedNodeId);
        console.log(selectedNode);
        _loadNode(selectedNode.label);
      });
    };

    this.initialize = function() {
      _createGraph();
      var init = [OntologyDataService.initialize()];
      return init;
    };

    this.search = (evt) => {

      if ((evt === undefined) || (evt.keyCode === 13)) {
        _loadNode(this.query);
      }
      else if ((evt !== undefined) && (evt.keyCode === 27)) {
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

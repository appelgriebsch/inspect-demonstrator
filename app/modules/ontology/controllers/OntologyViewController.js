(function(angular) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $mdDialog, OntologyDataService) {

    this.nodes = [];
    this.edges = [];
    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    this._createNode = function(nodeLabel) {

      var node = this._findNode(nodeLabel) || {
        id: this.nodes.length + 1,
        label: nodeLabel
      };

      if (node.id > this.nodes.length) {
        this.nodes.push(node);
      }

      return node;
    };

    this._findNode = function(nodeLabel) {

      return this.nodes.find((node) => {
        return node.label === nodeLabel;
      });
    };

    this.initialize = function() {

      var init = [OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        return OntologyDataService.node('http://www.AMSL/GDK/ontologie#Skimmer');
      }).then((results) => {
        $q.when(true).then(() => {
          results.map((item) => {
            var subjNode = this._createNode(item.subject);
            var objNode = this._createNode(item.object);
            this.edges.push({
              from: subjNode.id,
              to: objNode.id,
              label: item.predicate
            });

            var container = document.getElementById('ontology-graph');
            var data = {
              nodes: this.nodes,
              edges: this.edges
            };
            var options = {};
            var network = new vis.Network(container, data, options);
          });
        });
      });
    };
  }

  module.exports = OntologyViewController;

})(global.angular);

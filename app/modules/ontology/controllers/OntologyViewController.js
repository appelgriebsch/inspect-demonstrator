(function(angular) {

  'use strict';

  function OntologyViewController($scope, $state, $q, $mdDialog, OntologyDataService) {

    this.nodes = [];
    this.edges = [];
    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    this.initialize = function() {

      var init = [OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        return OntologyDataService.node('http://www.AMSL/GDK/ontologie#Skimmer');
      }).then((results) => {
        $q.when(true).then(() => {
          var i = 0;
          results.map((item) => {
            var subjNode = {
              id: ++i,
              label: item.subject
            };
            var objNode = {
              id: ++i,
              label: item.object
            };
            this.nodes.push(subjNode);
            this.nodes.push(objNode);
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

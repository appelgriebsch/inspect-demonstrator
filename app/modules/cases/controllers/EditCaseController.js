/*jshint esversion: 6 */
(function(angular, vis) {

  'use strict';

  /**
   * Controls the Add/Edit instance form
   * @param $scope
   * @param $state
   * @param $q
   * @param $location
   * @param CasesDataService
   * @constructor
   */
  function CasesViewController($scope, $state, $q, $location, CasesDataService, OntologyDataService) {
    this.state = $state.$current;
    $scope.data = {
      "case": {},
      classesTree: [],
    };

    var initialCase = undefined;
    this.graphOptions = {
      height: '550px',
      width: '900px',
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
    this.network = undefined;
    this.data = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet()
    };

    var _reset = () => {
      if (initialCase) {
        $scope.data["case"] = angular.copy(initialCase);
      }
    };

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
          return;
        }
      });
    };
    var _createInstanceNode = (clazz) => {
      var newNode = {
        id: this.data.nodes.length + 1,
        label: `${clazz.name}_${this.data.nodes.length + 1}`,
        title: `New ${clazz.name}`,
        type: clazz.id
      };
      return newNode;
    };

    this.isEditable = (element) => {
      if ((element === "id") && ($scope.data["case"].status === "new")) {
        return true;
      }
      if ((element === "name") && (($scope.data["case"].status === "new") || ($scope.data["case"].status === "open"))) {
        return true;
      }
      if ((element === "investigator") && (($scope.data["case"].status === "new") || ($scope.data["case"].status === "open"))) {
        return true;
      }
      if ((element === "description") && (($scope.data["case"].status === "new") || ($scope.data["case"].status === "open"))) {
        return true;
      }
      return false;
    };
    $scope.$on('case-reset', () => {
      _reset();
    });
    $scope.$on('case-cancel', () => {
      $location.path("/app/cases/view");
    });
    $scope.$on('case-save', () => {
      $scope.setBusy('Saving case...');
      $scope.data["case"].instances = [];
      this.data.nodes.forEach((node) => {
        $scope.data["case"].instances.push(node.label);
      });

      CasesDataService.save($scope.data["case"]).then(() => {
        initialCase = angular.copy($scope.data["case"]);
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('EditAction', 'edit', err);
        $scope.setReady(true);
      });
    });
    $scope.addInstance = (clazz) => {
      var newNode = _createInstanceNode(clazz);
      this.data.nodes.add(newNode);
      this.network.fit();
    };
    this.initialize = () => {
      $scope.setBusy('Initializing...');
      var init = [CasesDataService.initialize(), OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        $scope.data["case"] = CasesDataService.newCase();
        initialCase = angular.copy($scope.data["case"]);
         _createGraph();

       /* // XXX: just for development
        CasesDataService.fetchByCreator("jze").then((result) => {
          $scope.data["case"] = result.rows[0].doc;
        initialCase = angular.copy($scope.data["case"]);

        });*/
        OntologyDataService.fetchClassesTree().then((result) => {
          $scope.data.classesTree = result;
          $scope.setReady(true);
        });
      }).catch((err) => {
        $scope.setError('AddAction', 'add', err);
        $scope.setReady(true);
      });
    };
  }


  module.exports = CasesViewController;

})(global.angular, global.vis);

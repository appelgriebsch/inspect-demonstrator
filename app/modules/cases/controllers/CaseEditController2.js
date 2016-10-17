/*jshint esversion: 6 */
(function(angular, vis) {

  'use strict';


  function CaseEditController($scope, $state, $q, $mdSidenav, $mdDialog, CasesDataService, OntologyDataService) {
    this.state = $state.$current;
    var uuid = require('uuid');
    var objectProperties = {};
    var classes = {};


    var initialCase = undefined;
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

    $scope.data = {
      "case": {},
      classesTree: [],
      selectedNode: undefined
    };
    $scope.viewData = {
      showFooter: false
    };

    var DialogController = ($scope, $mdDialog, node) => {

      $scope.data = {
        // readonly data
        node: node,

        // changeable data
        selectedRelation: undefined,

      };
      console.log($scope.data.node);
      $scope.delete = function () {
        $mdDialog.hide({node: $scope.data.node, toBeDeleted: true});
      };
      $scope.cancel = () => {
        $mdDialog.cancel();
      };
      $scope.confirm = () => {
        $mdDialog.hide({node: $scope.data.node, toBeDeleted: false});
      };
    };

    var _showNodeDialog = (node) => {
      if (!node) {
        return;
      }
      var that = this;
      $mdDialog.show({
        controller: DialogController,
        templateUrl: 'modules/cases/views/dialog.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        locals: {node: $scope.selectedNode}
      }).then(function (result) {
        if (result.toBeDeleted) {
          that.data.nodes.remove(result.node.id);
        } else {
          that.data.nodes.update(result.node);
        }
      });
    };

    var _reset = () => {
      if (initialCase) {
        $scope.data["case"] = angular.copy(initialCase);
      }
    };

    var _createGraph = () => {
      var container = document.getElementById('ontology-graph');
      this.data.nodes.add($scope.data["case"].instances);
      this.network = new vis.Network(container, this.data, this.graphOptions);

      this.network.on('click', (params) => {
        if (params.nodes.length > 0) {
          $scope.selectedNode = this.data.nodes.get(params.nodes[0]);
          _showNodeDialog(this.data.nodes.get(params.nodes[0]));
        }

      });
      this.network.on('dragEnd', (params) => {
          console.log("dragend", params);

      });
    };

    var _createInstanceNode = (clazz) => {
      console.log("create individual clazz", clazz);
      var newNode = {
        id: uuid.v4(),
        label: `${clazz.name}_${this.data.nodes.length + 1}`,
        title: `New ${clazz.name}`,
        type: clazz.name,
        objectProperties: {}
      };
      // TODO: filter out inverse Relations
      var promises = [];
      clazz.objectPropertyUris.forEach((uri) => {
        newNode.objectProperties[uri] = [{name: 'test'}];
      });

      return newNode;
    };

    this.isEditable = (element) => {
      if ((element === "identifier") && ($scope.data["case"].status === "new")) {
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

      if ((element === "nodes") && (($scope.data["case"].status === "new") || ($scope.data["case"].status === "open"))) {
        return true;
      }
      return false;
    };

    $scope.$on('case-reset', () => {
      _reset();
    });

    $scope.$on('case-cancel', () => {
      $state.go('app.cases.view');
    });


    $scope.$on('case-save', () => {
      $scope.setBusy('Saving case...');
      $scope.data["case"].instances = [];
      this.data.nodes.forEach((node) => {
        $scope.data["case"].instances.push(node);
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
    $scope.toggleSidebar = function() {
      $q.when(true).then(() => {
        $mdSidenav("sidebar-tree").toggle();
      });
    };

    /**
     * Initializes both dependant services.
     * After completion the case and the ontology class structure is loaded.
     */
    this.initialize = () => {
      $scope.setBusy('Initializing...');
      var init = [CasesDataService.initialize(), OntologyDataService.initialize()];
      Promise.all(init).then(() => {
        var promises = [];
        if ($state.params.caseId) {
          promises.push(CasesDataService.case($state.params.caseId));
        } else {
          promises.push(CasesDataService.newCase());
        }
        promises.push(OntologyDataService.fetchRootClasses());
        return Promise.all(promises);
      }).then((result) => {
        $scope.data["case"] = result[0];
        if ($scope.data["case"].status !== "new") {
          $scope.viewData.showFooter = true;
        }
        initialCase = angular.copy($scope.data["case"]);
        _createGraph();
        $scope.data.classesTree = result[1];
        $scope.setReady(true);
      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };
  }
  module.exports = CaseEditController;

})(global.angular, global.vis);

(function () {
  'use strict';

  function TreeNodeController ($scope) {
    const vm = this;
    vm.$onInit = () => {
      if (!$scope.node) {
        $scope.node = {id: -1, label: 'none', children: []};
      }
    };
    vm.onNodeClicked = (id) => {
      console.log("tree node controller add this node", id);
    };



    $scope.isLeaf = () => {
      return Array.isArray($scope.node.children) && $scope.node.children.length === 0;
    };
    $scope.toggleExpanded = () => {
      if (($scope.isLeaf()) || ($scope.node.expanded === true)) {
        $scope.node.expanded = false;
        return;
      }
      $scope.node.expanded = true;
    };

  }
  module.exports = TreeNodeController;
})();

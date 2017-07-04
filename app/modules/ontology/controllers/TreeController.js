(function () {
  'use strict';

  function TreeController ($scope) {
    const vm = this;

    vm.treeNodes = [];

    const _convertDataForNode = (data) => {
      const node =  {
        id: data[vm.nodeId],
        label: data[vm.nodeLabel],
      };
      node.children = data[vm.nodeChildren].map((d) => {
        return _convertDataForNode(d);
      });
      return node;
    };
    vm.$onChanges = (obj) => {
      if (obj.treeData && obj.treeData.currentValue && Array.isArray(obj.treeData.currentValue)) {
        vm.treeNodes = obj.treeData.currentValue.map((d) => {
          return _convertDataForNode(d);
        });
      }
    };
    // XXX: not sure how to call the TreeController method from within the child scope
    $scope.onNodeClicked = (id) => {
      vm.onNodeClicked(id);
    };
    vm.$onInit = () => {
      vm.nodeId = 'id';
      vm.nodeLabel = 'label';
      vm.nodeChildren = 'children';
    };

  }
  module.exports = TreeController;
})();

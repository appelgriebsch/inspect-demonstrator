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
      if (data[vm.nodeChildren]) {
        node.children = data[vm.nodeChildren].map((d) => {
          return _convertDataForNode(d);
        });
      } else {
        node.children = [];
      }
      return node;
    };
    vm.$onChanges = (obj) => {
      if (obj.nodeId && obj.nodeId.currentValue && typeof obj.nodeId.currentValue === 'string') {
        vm.nodeId = obj.nodeId.currentValue;
      } else {
        if (!vm.nodeId) {
          vm.nodeId = 'id';
        }
      }
      if (obj.nodeLabel && obj.nodeLabel.currentValue && typeof obj.nodeLabel.currentValue === 'string') {
        vm.nodeLabel = obj.nodeLabel.currentValue;
      } else {
        if (!vm.nodeLabel) {
          vm.nodeLabel = 'label';
        }
      }
      if (obj.nodeChildren && obj.nodeChildren.currentValue && typeof obj.nodeChildren.currentValue === 'string') {
        vm.nodeChildren = obj.nodeChildren.currentValue;
      } else {
        if (!vm.nodeChildren) {
          vm.nodeChildren = 'children';
        }
      }
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
    };

  }
  module.exports = TreeController;
})();

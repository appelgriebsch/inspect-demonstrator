(function() {
  'use strict';

  function ClassTreeController($scope) {
    const vm = this;
    vm.treeData = [];

    $scope.add = (clazz) => {
      $scope.$parent.newInstanceNode(clazz.iri);
    };
    //TODO: collapse all on close
    $scope.treeClasses = {
      toggle: (collapsed, sourceNodeScope) => {
        if (collapsed === true){
          return true;
        }
      },
    };
    vm.$onInit = () => {

    };

  }
  module.exports = ClassTreeController;

})();

(function() {
  'use strict';

  function CasesTreeController($scope, $state) {
    this.state = $state.$current;

    $scope.hasSubClasses = (clazz) => {
      if ((clazz.childIris && clazz.childIris.length > 0) || (clazz.subClasses && clazz.subClasses.length > 0)) {
        return true;
      }
      return false;
    };

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
    this.initialize = function() {

    };
  }
  module.exports = CasesTreeController;

})();

(function(angular, vis) {

  'use strict';

  function OntologyDialogController($scope, $mdDialog, classes) {
    $scope.data = {
      name: undefined,
      selectedClass: undefined,
      classes: classes
    };
    $scope.closeDialog = function() {
      $mdDialog.hide($scope.data);
    };
    // TODO: add validation
    $scope.isValid = function () {
      return true;
    };
    $scope.cancelDialog = function() {
      $mdDialog.cancel();
    };
  }


  module.exports = OntologyDialogController;

})(global.angular, global.vis);

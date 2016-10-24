/*jshint esversion: 6 */
(function(angular) {

  'use strict';

  function CasesDialogController($scope, $state, $mdDialog, nodeId, objectProperties, datatypeProperties, individuals) {
    this.state = $state.$current;
    $scope.data = {
      // readonly data
      individual: {},
      objectProperties: objectProperties,
      datatypeProperties: datatypeProperties,
      individuals: individuals,

      // changeable data
      selectedObjectPropertyIri: undefined,
      selectedInstanceIri: undefined,
      newObjectProperties: [],
    };
    individuals.forEach((individual) => {
      if (individual.iri === nodeId) {
        $scope.data.individual = individual;
      }
    });

    $scope.delete = function() {
      $mdDialog.hide({individual: $scope.data.individual, toBeDeleted: true});
    };
    $scope.close = () => {
      $mdDialog.cancel();
    };

    $scope.rename = () => {
      $mdDialog.hide({individual: $scope.data.individual, toBeRenamed: true, newName: $scope.data.individual.label});
    };

    $scope.addRelation = () => {
      if (!$scope.data.selectedObjectPropertyIri) {
        return;
      }
      if (!$scope.data.selectedInstanceIri) {
        return;
      }
      $scope.data.objectProperties.forEach((prop) => {
        if (prop.iri === $scope.data.selectedObjectPropertyIri) {
          prop.target = $scope.data.selectedInstanceIri;
          $scope.data.newObjectProperties.push(prop);
        }
      });
    };

    return {
      initialize: function() {

      }
    };

  }
  module.exports = CasesDialogController;

})(global.angular);

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
    $scope.cancel = () => {
      $mdDialog.cancel();
    };
    $scope.confirm = () => {
      $mdDialog.hide({individual: $scope.data.individual, toBeDeleted: false});
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

        /*  //TODO: an welchen scope kann ich das anhängen?
          //$scope.$root.setBusy('Fetching data...');
          OntologyDataService.fetchClasses([node.classIri]).then((classes) => {
            if (classes.length > 0) {
              return  OntologyDataService.fetchObjectProperties(classes[0].objectPropertyIris);
            } else {
              return Promise.resolve([]);
            }
          }).then((objectProperties) => {
            $scope.data.objectProperties = _filterObjectProperties(node.classIri, objectProperties);
            //$scope.setReady(true);
          }).catch((err) => {
            $scope.setError('SearchAction', 'search', err);
            //$scope.setReady(true);
          });*/
      }
    };

  }
  module.exports = CasesDialogController;

})(global.angular);

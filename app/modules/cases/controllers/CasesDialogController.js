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
      selectedIndividualIri: undefined,
      newObjectProperties: [],
    };

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
      if (angular.isUndefined($scope.data.selectedObjectPropertyIri)) {
        return;
      }
      if (angular.isUndefined($scope.data.selectedIndividualIri)) {
        return;
      }
      const relation = _createRelation($scope.data.selectedObjectPropertyIri, $scope.data.selectedIndividualIri);

      if (!angular.isUndefined(relation)) {
        $mdDialog.hide({individualIri: $scope.data.individual.iri, newRelation: true, relation: relation});
      }
    };

    const _createRelation = (propertyIri, individualIri)=>{
      const relation = {};
      angular.forEach($scope.data.objectProperties, (prop) => {
        if (prop.iri === (propertyIri)) {
          relation.propIri =  prop.iri;
          relation.propLabel =  prop.label;
        }
      });
      angular.forEach($scope.data.individuals, (individual) => {
        if (individual.iri === (individualIri)) {
          relation.targetIri =  individual.iri;
          relation.targetLabel =  individual.label;
        }
      });
      if (angular.isUndefined(relation.propIri) || angular.isUndefined(relation.targetIri)) {
        return undefined;
      }
      return relation;
    };

    return {
      initialize: function() {
        angular.forEach(individuals, (individual) => {
          if (individual.iri === nodeId) {
            $scope.data.individual = individual;
          }
        });
        angular.forEach($scope.data.individual.objectProperties, (array, key) => {
          angular.forEach(array, (item) => {
            const relation = _createRelation(key, item.target);
            if (!angular.isUndefined(relation)) {
              $scope.data.newObjectProperties.push(relation);
            }
          });
        });
      }
    };

  }
  module.exports = CasesDialogController;

})(global.angular);

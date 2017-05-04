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
      selectedDatatypePropertyIri: undefined,
      selectedDatatypePropertyTarget: undefined,

      objectRelations: [],
      valueRelations: [],
    };

    $scope.close = () => {
      $mdDialog.cancel();
    };


    $scope.removeObjectRelation = (index) => {
      if ((index > -1 ) && (index < $scope.data.objectRelations.length)) {
        $mdDialog.hide({individualIri: $scope.data.individual.iri, removeRelation: true, relation: $scope.data.objectRelations[index]});
      }
    };

    $scope.removeValueRelation = (index) => {
      if ((index > -1 ) && (index < $scope.data.valueRelations.length)) {
        $mdDialog.hide({individualIri: $scope.data.individual.iri, removeRelation: true, relation: $scope.data.valueRelations[index]});
      }
    };

    $scope.addObjectRelation = () => {
      if (angular.isUndefined($scope.data.selectedObjectPropertyIri)) {
        return;
      }
      if (angular.isUndefined($scope.data.selectedIndividualIri)) {
        return;
      }
      const relation = _createObjectRelation($scope.data.selectedObjectPropertyIri, $scope.data.selectedIndividualIri);

      if (!angular.isUndefined(relation)) {
        $mdDialog.hide({individualIri: $scope.data.individual.iri, addRelation: true, relation: relation});
      }
    };

    $scope.addDatatypeRelation = () => {
      if (angular.isUndefined($scope.data.selectedDatatypePropertyIri)) {
        return;
      }
      if (angular.isUndefined($scope.data.selectedDatatypePropertyTarget)) {
        return;
      }
      const relation = _createValueRelation($scope.data.selectedDatatypePropertyIri, $scope.data.selectedDatatypePropertyTarget);

      if (!angular.isUndefined(relation)) {
        $mdDialog.hide({individualIri: $scope.data.individual.iri, addRelation: true, relation: relation});
      }
    };


    const _createValueRelation = (propertyIri, value)=>{
      const relation = {type: 'value'};
      angular.forEach($scope.data.datatypeProperties, (prop) => {
        if (prop.iri === (propertyIri)) {
          relation.propIri =  prop.iri;
          relation.propLabel =  prop.label;
        }
      });
      relation.targetValue =  value;
      if (angular.isUndefined(relation.propIri)) {
        return undefined;
      }
      return relation;
    };

    const _createObjectRelation = (propertyIri, individualIri)=>{
      const relation = {type: 'object'};
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
        console.log("individual", nodeId, $scope.data.individual);
        angular.forEach($scope.data.individual.objectProperties, (array, key) => {
          angular.forEach(array, (item) => {
            const relation = _createObjectRelation(key, item.target);
            if (!angular.isUndefined(relation)) {
              $scope.data.objectRelations.push(relation);
            }
          });
        });
        angular.forEach($scope.data.individual.datatypeProperties, (array, key) => {
          angular.forEach(array, (item) => {
            const relation = _createValueRelation(key, item.target);
            if (!angular.isUndefined(relation)) {
              $scope.data.valueRelations.push(relation);
            }
          });
        });
      }
    };

  }
  module.exports = CasesDialogController;

})(global.angular);
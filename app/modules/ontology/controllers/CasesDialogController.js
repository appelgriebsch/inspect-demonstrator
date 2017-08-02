(function(angular) {

  'use strict';

  function CasesDialogController($scope, $state, $mdDialog, nodeId, objectProperties, datatypeProperties, individuals) {
    const vm = this;
    vm.state = $state.$current;

    vm.individual = individuals.find((i) => {
      return (i.iri === nodeId);
    });

    vm.individuals = individuals;
    vm.objectProperties = objectProperties;
    vm.datatypeProperties = datatypeProperties;

    vm.objectRelations = [] ;
    vm.individual.objectProperties.forEach((prop) => {
      const target = individuals.find((i) => {
        return i.iri === prop.target;
      });
      if (target) {
        vm.objectRelations.push({
          iri: prop.iri,
          label: prop.label,
          targetIri: target.iri,
          target: target.label
        });
      }
    });
    vm.valueRelations = vm.individual.datatypeProperties.map((prop) => {
      return {
        iri: prop.iri,
        label: prop.label,
        target: prop.target
      };
    });
    vm.selectedObjectPropertyIri = undefined;
    vm.selectedIndividualIri = undefined;
    vm.selectedDatatypePropertyIri = undefined;
    vm.selectedDatatypePropertyTarget = undefined;

    $scope.close = () => {
      $mdDialog.cancel();
    };

    $scope.removeObjectRelation = (index) => {
      if ((index < 0 ) || (index >= vm.objectRelations.length)) {
        $mdDialog.cancel();
        return;
      }
      const prop = vm.objectProperties.find((p) => {
        return p.iri === vm.objectRelations[index].iri;
      });
      const target = vm.individuals.find((i) => {
        return i.iri === vm.objectRelations[index].targetIri;
      });
      if (angular.isUndefined(prop) || angular.isUndefined(target)) {
        $mdDialog.cancel();
        return;
      }
      $mdDialog.hide({
        individual: vm.individual,
        removeRelation: true,
        property: prop,
        target : target,
        type: 'object'
      });
    };

    $scope.removeValueRelation = (index) => {
      if ((index < 0 ) || (index >= vm.valueRelations.length)) {
        $mdDialog.cancel();
        return;
      }
      const prop = vm.datatypeProperties.find((p) => {
        return p.iri === vm.valueRelations[index].iri;
      });
       if (angular.isUndefined(prop)) {
        $mdDialog.cancel();
        return;
      }
      $mdDialog.hide({
        individual: vm.individual,
        removeRelation: true,
        property: prop,
        target : vm.valueRelations[index].target,
        type: 'value'
      });
    };

    $scope.addObjectRelation = () => {
      if (angular.isUndefined(vm.selectedObjectPropertyIri)) {
        $mdDialog.cancel();
        return;
      }
      if (angular.isUndefined(vm.selectedIndividualIri)) {
        $mdDialog.cancel();
        return;
      }
      const prop = vm.objectProperties.find((p) => {
        return p.iri === vm.selectedObjectPropertyIri;
      });
      const target = vm.individuals.find((i) => {
        return i.iri === vm.selectedIndividualIri;
      });
      if (angular.isUndefined(prop) || angular.isUndefined(target)) {
        $mdDialog.cancel();
        return;
      }
      $mdDialog.hide({
        individual: vm.individual,
        addRelation: true,
        property: prop,
        target : target,
        type: 'object'
      });
    };

    $scope.addDatatypeRelation = () => {
      if (angular.isUndefined(vm.selectedDatatypePropertyIri)) {
        $mdDialog.cancel();
        return;
      }
      if (angular.isUndefined(vm.selectedDatatypePropertyTarget)) {
        $mdDialog.cancel();
        return;
      }
      const prop = vm.datatypeProperties.find((p) => {
        return p.iri === vm.selectedDatatypePropertyIri;
      });
      if (angular.isUndefined(prop)) {
        $mdDialog.cancel();
        return;
      }
      $mdDialog.hide({
        individual: vm.individual,
        addRelation: true,
        property: prop,
        target : vm.selectedDatatypePropertyTarget,
        type: 'value'
      });
    };
  }
  module.exports = CasesDialogController;

})(global.angular);

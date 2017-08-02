(function (angular) {
  'use strict';

  function OntologyViewStatusController ($scope, OntologyDataService) {
    const vm = this;

    const _makeList = (iris) => {
      if (!iris || iris.length < 1) {
        return 'None';
      }
      return iris.map((iri) => {
        return iri.replace(OntologyDataService.ontologyIri(), '');
      }).reduce((accumulator, item, index, array) => {
        accumulator += item;
        if (index + 1 < array.length) {
          accumulator += ', ';
        }
        return accumulator;
      }, '');
    };

    $scope.$on('NodesDeselectedEvent', (event, data) => {
      vm.reset();
    });

    $scope.$on('NodesSelectedEvent', (event, data) => {
      vm.reset();
      if (data && Array.isArray(data) && data.length > 0) {
        if (data[0].type === 'CLASS_NODE') {
          OntologyDataService.fetchClass(data[0].id, { subClasses: true, superClasses: true}).then((clazz) => {
            vm.name = clazz.label;
            vm.nodeType = 'class';
            vm.parents = _makeList(clazz.parentClassIris);
            vm.children = _makeList(clazz.childClassIris);
            $scope.$apply();
          }).catch((err) => {
            $scope.setError('SearchAction', 'search', err);
            $scope.setReady(true);
          });
        }
        if (data[0].type === 'INDIVIDUAL_NODE') {
          vm.name = data[0].label;
          vm.nodeType = 'individual';
          vm.cases = _makeList(data[0].cases);
          vm.types = _makeList(data[0].classes);
          $scope.$apply();
        }
      }
    });
    vm.$onInit = () => {
      vm.reset();
    };

    vm.reset = () => {
      vm.name = '';
      vm.types = '';
      vm.cases = '';
      vm.nodeType = '';
      vm.parents = '';
      vm.children = '';
    };
  }
  module.exports = OntologyViewStatusController;
})(global.angular);

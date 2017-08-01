(function () {
  'use strict';

  function OntologyAutoCompleteController ($scope) {
    const vm = this;

    vm.items = [];
    vm.selectedItem = undefined;
    vm.searchText = '';
    vm.label = '';

    vm.findTerm = (searchText) => {
      return vm.items.filter((item) => {
        if (typeof item.label === 'string') {
          return item.label.search(new RegExp(searchText, 'i')) > -1;
        }
        return false;
      });
    };

    $scope.itemSelected = () => {
      if (vm.selectedItem) {
        vm.onItemSelected({item: vm.selectedItem});
        if (vm.clearOnSelect === 'true') {
          vm.selectedItem = undefined;
          vm.searchText = '';
        }
      }
    };

    vm.$onInit = () => {

    };
  }
  module.exports = OntologyAutoCompleteController;
})();

(function(angular) {

  'use strict';

  function OntologyAutoCompleteController() {
    const vm = this;

    vm.items = [];
    vm.selectedItem = undefined;
    vm.searchText = '';

    vm.findTerm = (searchText) => {
      return vm.items.filter((item) => {
        if (typeof item.label ===  "string"){
          return item.label.search(new RegExp(searchText, 'i')) > -1;
        }
        return false;
      });
    };

    vm.reset = () => {
      vm.selectedItem = undefined;
      vm.searchText = '';
    };

    vm.$onInit = () => {
    };

  }
  module.exports = OntologyAutoCompleteController;

})(global.angular);

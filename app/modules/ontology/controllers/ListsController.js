(function () {
  'use strict';

  function ListsController ($scope) {
    const vm = this;

    vm.onNodeClicked = (id) => {
      console.log("node clicked", id);
    };

    vm.$onInit = () => {

      //console.log("case data", vm.caseData);
    };

  }
  module.exports = ListsController;
})();

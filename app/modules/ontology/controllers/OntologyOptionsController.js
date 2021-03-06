(function (angular) {
  'use strict';

  function OntologyOptionsController ($scope, $mdDialog) {
    const vm = this;
    vm.selectedNodes = [];

    vm.isDisabled = (data) => {
      if (data === 'showNeighbors') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'setFocus') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'removeNodes') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'showNeighbors') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'resetGraph') {
        return false;
      }
      return true;
    };


    vm.isIndeterminate = function() {
      const selectedFilters = vm.filters.filter((f) => {
        return f.enabled === true;
      });
      if ((selectedFilters.length === 0) || (selectedFilters.length === vm.filters.length)) {
        return false;
      }
      return true;
    };

    vm.isChecked = function() {
      const selectedFilters = vm.filters.filter((f) => {
        return f.enabled === true;
      });
      if (selectedFilters.length === vm.filters.length) {
        return true;
      }
      return false;
    };

    vm.toggleAll = function() {
      const selectedFilters = vm.filters.filter((f) => {
        return f.enabled === true;
      });
      const enable = (selectedFilters.length !== vm.filters.length);
      vm.filters = vm.filters.map((f) => {
          f.enabled = enable;
          return f;
        });

    };

    /** inner events **/
    vm.showDialog = function (event, filterId) {
      const filter = vm.filters.find((f) => {
        return f.id === filterId;
      });
      if (filter === undefined) {
        return;
      }
      $mdDialog.show({
        controller: ($scope, $mdDialog, palette) => {
          $scope.palette = palette;
          $scope.selectColor = (color) => {
            $mdDialog.hide({color: color});
          };
          $scope.cancel = () => {
            $mdDialog.cancel();
          };
        },
        templateUrl: 'color.picker.dialog.html',
        parent: angular.element(document.body),
        targetEvent: event,
        clickOutsideToClose: true,
        locals: {palette: vm.palette}
      })
        .then((result) => {
          filter.color = result.color;
          vm.onColorChanged({id: filter.id, color: result.color, type: filter.type});
        }, () => {

        });
    };

    vm.$onInit = () => {

    };
  }
  module.exports = OntologyOptionsController;
})(global.angular);

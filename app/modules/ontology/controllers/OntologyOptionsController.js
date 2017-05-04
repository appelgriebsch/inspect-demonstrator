(function(angular) {

  'use strict';

  function OntologyOptionsController($scope, $mdDialog) {
    const vm = this;
    vm.depth = 0;
    vm.selectedNodes = [];

    vm.isDisabled = (data) => {
      if (data === 'showNeighbors') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'setFocus') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'releaseFocus') {
        return !vm.isFocused;
      }
      if (data === 'hideNodes') {
        return vm.selectedNodes.length < 1;
      }
      if (data === 'showNodes') {
        return vm.hiddenNodesStackSize < 1;
      }
      if (data === 'resetGraph') {
        return false;
      }
      return true;
    };

    /** inner events **/
    // TODO: directly calling a controller method doesn't seem to work because
    // of ng-repeat, don't know how to properly address that
    $scope.zoom = (data) => {
      vm.onZoomTo(data);
    };
    vm.showDialog = function(event, filterId) {
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
        clickOutsideToClose:true,
        locals: {palette: vm.palette}
      })
        .then((result) => {
          filter.color = result.color;
          vm.onColorChanged({id: filter.id, color: result.color});
        }, () => {

        });
    };

    // TODO:  ???
    vm.releaseFocus = () => {

    };
    vm.$onInit = () => {
      $scope.$watch(
        (scope) => {
          return( vm.selectedNodes );
        },
        (newValue, oldValue) => {
          if (newValue.length !== oldValue.length) {
            vm.depth = 0;
          } else {
            for (let i = 0; i < newValue.length; i++) {
              if (newValue[i] !== oldValue[i]) {
                vm.depth = 0;
                break;
              }
            }
          }
        },
        true
      );



    };

  }
  module.exports = OntologyOptionsController;

})(global.angular);

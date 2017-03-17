(function(angular, vis) {

  'use strict';

  function OntologyViewSideNavController($scope, $state, $q, $mdSidenav) {
    $scope.data = {
      selectedNode: undefined,
      focusedNode: undefined,
      filterData : [],
      level: 1
    };

    $scope.isHidden = (data) => {
      if (data === 'nextLevel') {
        return angular.isUndefined($scope.data.selectedNode);
      }
      if (data === 'setFocus') {
        return angular.isUndefined($scope.data.selectedNode);
      }
      if (data === 'releaseFocus') {
        return angular.isUndefined($scope.data.focusedNode);
      }
      if (data === 'hideNode') {
        return angular.isUndefined($scope.data.selectedNode);
      }

      if (data === 'resetGraph') {
        return false;
      }

    };
    /** events from graph controller **/
    $scope.$on('nodeSelectedEvent', (event, data) => {
      $scope.data.selectedNode = data;
      $scope.$apply();
    });
    $scope.$on('filtersCreatedEvent', (event, filterData) => {
      $scope.data.filterData = filterData;
    });

    /** inner events **/
    $scope.setFocus = () => {
      if (angular.isUndefined($scope.data.selectedNode)) {
        return;
      }
      $scope.data.focusedNode = $scope.data.selectedNode;
      $scope.$emit('nodeFocusedEvent', {
        node: $scope.data.focusedNode
      });
    };

    $scope.releaseFocus = () => {
      $scope.data.focusedNode = undefined;
      $scope.$emit('nodeFocusReleasedEvent');
    };

    $scope.toggleSidebar = function(id) {
      $q.when(true).then(() => {
        $mdSidenav(id).toggle();
      });
    };
    $scope.nextLevel = (event) => {
      $scope.$emit('nextLevelEvent', {
        node: $scope.data.selectedNode,
        level: $scope.data.level

      });
    };

    $scope.colorChange = (filter) => {
      $scope.$emit('colorChangeEvent', filter);
    };
    $scope.hideNode = () => {
      $scope.$emit('hideNodeEvent', {
        node: $scope.data.selectedNode
      });
      $scope.data.selectedNode = undefined;
    };
    $scope.resetGraph = () => {
      $scope.$emit('resetGraphEvent');
      $scope.data.selectedNode = undefined;
      $scope.data.focusedNode = undefined;
    };
    $scope.toggleFilter = (id) => {
      let filter;
      $scope.data.filterData.map((f) => {
        // update model because angular doesn't, maybe I am doing something wrong?
        if (f.id === id) {
          f.checked = !f.checked;
          filter = f;
        }
      });
      if (!angular.isUndefined(filter)) {
        if (filter.checked === true){
          $scope.$emit('showNodeGroupEvent', {
            id: id,
          });
        } else {
          $scope.$emit('hideNodeGroupEvent', {
            id: id,
          });
        }
      }
    };










    $scope.physicsOnOff = () => {
      if ($scope.physicsEnabled === true) {
        this.network.physics.enabled = true;
      } else {
        this.network.physics.enabled = false;
      }
    };


    return {
      initialize: function() {

      }
    };
  }

  module.exports = OntologyViewSideNavController;

})(global.angular, global.vis);

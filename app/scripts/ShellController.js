(function() {

  'use strict';

  function ShellController($state, $mdSidenav, $scope, $log, $q, modulesProvider) {

    this.modules = [];

    this.initialize = function() {
      this.modules = modulesProvider.modules;
    };

    this.toggleSidebar = () => {
      $q.when(true).then(() => {
        $mdSidenav('sidebar').toggle();
      });
    };

    this.submit = () => {
      $q.when(true).then(() => {
        $scope.$broadcast('submit', $state.current.name);
      });
    };

    this.cancel = () => {
      $q.when(true).then(() => {
        $scope.$broadcast('cancel', $state.current.name);
      });
    };
  }

  module.exports = ShellController;

})();

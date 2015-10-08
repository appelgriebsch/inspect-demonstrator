(function() {

  'use strict';

  function ShellController($mdSidenav, $scope, $log, $q, modulesProvider) {

    this.modules = [];

    this.initialize = function() {
      this.modules = modulesProvider.modules;
    };

    this.toggleSidebar = () => {
      $q.when(true).then(() => {
        $mdSidenav('sidebar').toggle();
      });
    };

    this.sendEvent = (event, arg) => {
      $q.when(true).then(() => {
        $scope.$broadcast(event, arg);
      });
    };
  }

  module.exports = ShellController;

})();

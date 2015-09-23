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

    this.submit = () => {
      $scope.$emit('submit');
    };

    this.cancel = () => {
      $scope.$emit('cancel');
    };
  }

  module.exports = ShellController;

})();

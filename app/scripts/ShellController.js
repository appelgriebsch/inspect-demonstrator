(function() {

  'use strict';

  function ShellController($scope, $log, $q, modulesProvider) {

    this.modules = [];

    this.initialize = function() {
      this.modules = modulesProvider.modules;
    };

    this.sendEvent = (event, arg) => {
      $q.when(true).then(() => {
        $scope.$broadcast(event, arg);
      });
    };
  }

  module.exports = ShellController;

})();

(function() {

  'use strict';

  function ShellController($mdSidenav, $scope, $log, $q) {

    this.initialize = function() {
      // TODO: initialization code
    };

    this.toggleSidebar = () => {
      $q.when(true).then(() => {
        $mdSidenav('sidebar').toggle();
      });
    };

    this.submit = () => {
      console.log('emit');
      $scope.$emit('submit');
    };
  }

  module.exports = ShellController;
  
})();

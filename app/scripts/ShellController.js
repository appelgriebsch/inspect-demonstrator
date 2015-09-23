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
      console.log('send submit');
      $scope.$emit('submit');
    };

    this.cancel = () => {
      console.log('send cancel');
      $scope.$emit('cancel');
    };
  }

  module.exports = ShellController;

})();

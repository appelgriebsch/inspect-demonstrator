(function() {

  'use strict';

  function ShellController($scope, $log, $q, $notification, modulesProvider, ActivityService) {

    this.modules = [];
    this.isBusy = false;
    this.statusMessage = '';
    this.isDirty = false;

    $scope.setBusy = (msg) => {
      $q.when(true).then(() => {
        this.isBusy = true;
        this.statusMessage = msg;
        this.isDirty = false;
      });
    };

    $scope.setReady = (dirty) => {
      $q.when(true).then(() => {
        this.isBusy = false;
        this.statusMessage = '';
        this.isDirty = dirty;
      });
    };

    $scope.notify = (title, message) => {
      $notification(title, {
        body: message,
        delay: 2000
      });
    };

    $scope.setError = (error) => {
      $scope.notify('An error occured!', error.message);
      return $scope.writeLog('error', error);
    };

    $scope.writeLog = (type, info) => {

      var result;

      switch (type) {
      case 'info':
        result = ActivityService.addInfo(info);
        break;

      case 'warning':
        result = ActivityService.addWarning(info);
        break;

      case 'error':
        result = ActivityService.addWarning(info);
        break;
      }

      return result;
    };

    this.initialize = function() {
      this.modules = modulesProvider.modules;
      return $notification.requestPermission();
    };

    this.sendEvent = (event, arg) => {
      $q.when(true).then(() => {
        $scope.$broadcast(event, arg);
      });
    };
  }

  module.exports = ShellController;

})();

(function(angular) {

  'use strict';

  function ShellController($scope, $log, $q, $notification, $mdToast, modulesProvider, ActivityService) {

    var remote = require('remote');
    var app = remote.require('app');

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

      if (process.platform === 'win32') {
        $mdToast.show(
          $mdToast.simple().content(message).position('bottom right').hideDelay(2000));
      } else {
        $notification(title, {
          body: message,
          delay: 2000
        });
      }
    };

    $scope.setError = (error) => {
      $scope.notify('An error occured!', error.message);

      var info = angular.copy(error);
      info.type = 'error';
      info.icon = 'error';
      info.description = `Error: ${error.message}`;

      return $scope.writeLog('error', info);
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
        result = ActivityService.addError(info);
        break;
      }

      return result;
    };

    this.initialize = function() {
      this.modules = modulesProvider.modules;
      return Promise.all([
        $notification.requestPermission(),
        ActivityService.initialize()
      ]);
    };

    this.toggleFullscreen = function() {
      app.toggleFullscreen();
    };

    this.platform = function() {
      console.log(app.sysConfig().platform);
      return app.sysConfig().platform;
    };

    this.closeApp = function() {
      ActivityService.close().then(() => {
        app.close();
      });
    };

    this.sendEvent = (event, arg) => {
      $q.when(true).then(() => {
        $scope.$broadcast(event, arg);
      });
    };
  }

  module.exports = ShellController;

})(global.angular);

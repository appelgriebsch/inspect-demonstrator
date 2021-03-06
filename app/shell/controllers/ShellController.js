(function(angular) {

  'use strict';

  function ShellController($scope, $log, $q, $mdSidenav, modulesProvider, ActivityService) {

    var app = require('electron').remote.app;
    var appCfg = app.sysConfig();

    this.appName = `${appCfg.app.name} v${appCfg.app.version}`;
    this.modules = [];
    this.isBusy = false;
    this.statusMessage = '';
    this.isDirty = false;
    this.fabOpen = false;
    this.activeMode = false;
    this.activeModeLabel = '';

    $scope.setModeLabel = (label) => {
      $q.when(true).then(() => {
        this.activeModeLabel = label;
      });
    };

    $scope.getModeLabel = () => {
      return this.activeModeLabel;
    };

    $scope.getActiveMode = () => {
      return this.activeMode;
    };

    $scope.setBusy = (msg) => {
      $q.when(true).then(() => {
        this.isBusy = true;
        this.statusMessage = msg;
        this.isDirty = false;
      });
    };
    const _setBusy = (event, data) => {
      $scope.setBusy(data.msg);
    };

    const _setReady = (event, data) => {
      $scope.setReady(data.dirty);
    };

    const _setError = (event, data) => {
      $scope.setError(data.template, data.icon, data.error);
    };

    $scope.setReady = (dirty) => {
      $q.when(true).then(() => {
        this.isBusy = false;
        this.statusMessage = '';
        this.isDirty = dirty;
      });
    };

    $scope.notify = (title, message) => {
      new Notification(title, {
        body: message,
        timeout: 2000
      });
    };

    $scope.createEventFromTemplate = (template, icon, error) => {
      return ActivityService.createEventFromTemplate(template, icon, error);
    };

    $scope.setError = (template, icon, error) => {
      $scope.notify('An error occured!', error.message);

      console.log(error);

      var info = $scope.createEventFromTemplate(template, icon, error);
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
        ActivityService.initialize(),
        Notification.requestPermission()
      ]);
    };

    this.toggleFullscreen = function() {
      app.toggleFullscreen();
    };

    this.platform = function() {
      return appCfg.platform;
    };

    this.minimizeApp = function() {
      app.minimizeAppToSysTray();
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

    this.toggleSidebar = function() {
      var pending = $q.when(true);
      pending.then(() => {
        $mdSidenav('sidebar').toggle();
      });
    };
  }

  module.exports = ShellController;

})(global.angular);

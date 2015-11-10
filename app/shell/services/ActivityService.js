(function(angular) {

  'use strict';

  function ActivityService(ActivityDataService) {

    var remote = require('remote');
    var app = remote.require('app');
    var sysCfg = app.sysConfig();
    var ipc = require('ipc');

    var _prefill = function(event) {

      var doc = angular.copy(event);
      var today = new Date();

      doc.createdAt = today.toISOString();
      doc.createdBy = sysCfg.user;
      doc.createdOn = sysCfg.host;

      delete doc._id;
      delete doc._rev;

      return doc;
    };

    this.initialize = function() {
      return Promise.all([
        ActivityDataService.initialize(),
        this.addWarning({
          icon: 'flash_on',
          description: 'Application started!'
        })
      ]);
    };

    this.close = function() {
      this.addWarning({
        icon: 'power_settings_new',
        description: 'Application shutted down!'
      }).then(() => {
        return;
      });
    };

    this.addInfo = function(entry) {

      var doc = _prefill(entry);
      doc.class = 'info';

      return ActivityDataService.writeEntry(doc);
    };

    this.addWarning = function(entry) {

      var doc = _prefill(entry);
      doc.class = 'warning';

      return ActivityDataService.writeEntry(doc);
    };

    this.addError = function(entry) {

      var doc = _prefill(entry);
      doc.class = 'danger';

      return ActivityDataService.writeEntry(doc);
    };

    ipc.on('app-closed', () => {
      this.close();
    });
  }

  module.exports = ActivityService;

})(global.angular);

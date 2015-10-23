(function(angular) {

  'use strict';

  function ActivityService(ActivityDataService) {

    var remote = require('remote');
    var app = remote.require('app');
    var sysCfg = app.sysConfig();

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
      return ActivityDataService.initialize();
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
  }

  module.exports = ActivityService;

})(global.angular);

(function() {

  'use strict';

  angular.module('inspectApp').controller('CaptureController', ['$state', '$log', '$q', 'AuditService', CaptureController]);

  function CaptureController($state, $log, $q, AuditService) {

    var self = this;

    self.initialize = function() {

      return AuditService.initialize();
    };

    self.submit = function() {

      var info = {
        type: 'capture',
        url: 'http://www.heise.de'
      };

      return AuditService.addEvent(info);
    };

  };

})();

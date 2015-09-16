(function() {

  'use strict';

  angular.module('inspectApp').controller('CaptureController', ['$state', '$log', '$q', 'LogService', CaptureController]);

  function CaptureController($state, $log, $q, logService) {

    var self = this;

    self.initialize = function() {

      return logService.initialize();
    };

    self.submit = function() {

      var info = {
        class: 'info',
        type: 'capture',
        url: 'http://www.heise.de'
      };

      return logService.addEvent(info);
    };

  };

})();

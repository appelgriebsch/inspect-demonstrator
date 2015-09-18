(function() {

  'use strict';

  angular.module('inspectApp').controller('CaptureController', ['$state', '$log', '$q', 'LogService', CaptureController]);

  function CaptureController($state, $log, $q, logService) {

    this.initialize = function() {
      return logService.initialize();
    };

    this.submit = function() {
      var info = {
        class: 'info',
        type: 'capture',
        url: 'http://www.heise.de'
      };
      return logService.addInfo(info);
    };
  }

})();

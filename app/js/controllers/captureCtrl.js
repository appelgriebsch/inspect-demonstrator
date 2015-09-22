(function() {

  'use strict';

  angular.module('inspectApp').controller('CaptureController', ['$state', '$log', '$q', 'LogService', CaptureController]);

  function CaptureController($state, $log, $q, logService) {

    this.initialize = function() {
      return logService.initialize();
    };

    var _loadUrl = function(url) {
      console.log(url);
      $q.when(true).then(() => {
        document.querySelector('#webview').src = url;
      });
    };

    this.loadUrl = (evt) => {

      if ((evt.keyCode) && (evt.keyCode == 13)) {
        _loadUrl(evt.target.value);
      }

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

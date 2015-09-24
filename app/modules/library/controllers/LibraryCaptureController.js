(function() {

  'use strict';

  function LibraryCaptureController($q, ActivityService, LibraryDataService) {

    this.initialize = function() {
      return ActivityService.initialize();
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
      return ActivityService.addInfo(info);
    };
  }

  module.exports = LibraryCaptureController;

})();

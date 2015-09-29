(function() {

  'use strict';

  function LibraryCaptureController($q, ActivityService, LibraryDataService) {

    this.initialize = function() {
      return ActivityService.initialize();
    };

    this.capture = undefined;

    var _loadUrl = function(uri) {

      var remote = require('remote');
      var app = remote.require('app');

      app.captureWebSiteService().capturePreview(uri).then((result) => {

        console.log(result);
        $q.when(true).then(() => {
          this.capture = result;
        });

      }).catch((err) => {

        console.log(err);
      });

    }.bind(this);

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

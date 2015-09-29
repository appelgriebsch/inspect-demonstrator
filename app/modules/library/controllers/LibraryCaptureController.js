(function() {

  'use strict';

  function LibraryCaptureController($q, ActivityService, LibraryDataService) {

    this.initialize = function() {
      return ActivityService.initialize();
    };

    this.capture = undefined;
    this.isBusy = false;

    var _loadUrl = function(uri) {

      var remote = require('remote');
      var app = remote.require('app');

      this.isBusy = true;

      app.captureWebSiteService().capturePreview(uri).then((result) => {
        $q.when(true).then(() => {
          this.isBusy = false;
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
        url: this.capture.url
      };
      return ActivityService.addInfo(info);
    };
  }

  module.exports = LibraryCaptureController;

})();

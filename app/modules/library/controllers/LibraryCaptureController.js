(function() {

  'use strict';

  function LibraryCaptureController($scope, $state, $q, ActivityService, LibraryDataService) {

    this.capture = undefined;
    this.isBusy = false;

    this.initialize = function() {

      $scope.$on('submit', (event, args) => {

        var notifier = require('node-notifier');
        this.isBusy = true;

        var info = {
          class: 'info',
          type: 'capture',
          details: this.capture,
          url: this.capture.url
        };

        notifier.notify({
          title: 'Website captured',
          message: `${info.details.title} has been captured.`
        });

        ActivityService.addInfo(info).then(() => {
          $q.when(true).then(() => {
            this.isBusy = false;
            $state.go('^.view');
          });
        });
      });

      return ActivityService.initialize();
    };

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
  }

  module.exports = LibraryCaptureController;

})();

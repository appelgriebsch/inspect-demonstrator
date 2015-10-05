(function() {

  'use strict';

  function LibraryCaptureController($scope, $state, $q, $notification, ActivityService, PouchDBService) {

    var remote = require('remote');
    var app = remote.require('app');

    this.isBusy = false;
    this.capture;
    this.url;

    this.initialize = function() {

      $scope.$on('submit', (event, args) => {

        this.isBusy = true;

        app.captureWebSiteService().capturePage(this.url).then((result) => {

          var _attachments = {};

          _attachments[result.name] = {
            'content_type': result.type,
            'data': result.content
          };

          this.capture._attachments = _attachments;
          this.capture.status = 'uploaded';

          var db = PouchDBService.initialize('library');

          db.post(this.capture).then((dbRes) => {

            var info = {
              class: 'info',
              type: 'capture',
              details: this.capture,
              url: this.capture.url
            };

            $notification('Website captured', {
              body: `${info.details.title} has been captured.`,
              delay: 2000
            });

            ActivityService.addInfo(info).then(() => {
              $q.when(true).then(() => {
                this.capture = null;
                this.url = null;
                this.isBusy = false;
                $state.go('^.view');
              });
            });
          });
        });
      });

      $notification.requestPermission().then(() => {
        return ActivityService.initialize();
      });
    };

    var _loadUrl = function() {

      this.isBusy = true;

      app.captureWebSiteService().capturePreview(this.url).then((result) => {
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
        this.url = evt.target.value;
        _loadUrl();
      }
      else if (typeof evt === MouseEvent){
        this.url = document.querySelector('#url').value;
        _loadUrl();
      }
    };
  }

  module.exports = LibraryCaptureController;

})();

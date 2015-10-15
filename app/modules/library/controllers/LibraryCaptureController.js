(function() {

  'use strict';

  function LibraryCaptureController($scope, $state, $q, $notification, ActivityService, PouchDBService) {

    var remote = require('remote');
    var app = remote.require('app');
    var sysCfg = app.sysConfig();

    var _prefill = function(upload) {

      var doc = angular.copy(upload);
      var today = new Date();

      doc.createdAt = today.toISOString();
      doc.createdBy = sysCfg.user;
      doc.createdOn = sysCfg.host;

      return doc;
    };

    $scope.$on('submit', (event, args) => {

      this.isBusy = true;
      this.statusMessage = 'Snapshotting Web Site...';

      app.captureWebSiteService().capturePage(this.url).then((result) => {

        var _attachments = {};

        result.attachments.forEach((attachment) => {
          _attachments[attachment.name] = {
            'content_type': attachment.type,
            'data': attachment.content
          };
        });

        var doc = _prefill(this.capture);
        doc._attachments = _attachments;
        doc.status = 'uploaded';

        console.log(doc);
        
        var db = PouchDBService.initialize('library');

        db.post(doc).then((dbRes) => {

          var details = angular.copy(doc);
          delete details._attachments;
          delete details.preview;

          var info = {
            type: 'capture',
            id: dbRes._id,
            details: details
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

    $scope.$on('cancel', (event, args) => {

      $q.when(true).then(() => {
        this.capture = null;
        this.url = null;
        this.isBusy = false;
        $state.go('^.view');
      });

    });

    var _loadUrl = function() {

      this.isBusy = true;
      this.statusMessage = 'Analysing Web Site...';
      app.captureWebSiteService().capturePreview(this.url).then((result) => {
        $q.when(true).then(() => {
          this.isBusy = false;
          this.capture = result;
        });
      });

    }.bind(this);

    this.isBusy = false;
    this.capture;
    this.url;
    this.statusMessage;

    this.initialize = function() {
      $notification.requestPermission().then(() => {
        return ActivityService.initialize();
      });
    };

    this.loadUrl = (evt) => {

      if ((evt.keyCode) && (evt.keyCode == 13)) {
        $q.when(true).then(() => {
          this.url = evt.target.value;
          _loadUrl();
        });
      }
      else if ((evt.type) && (evt.type === 'click')) {
        $q.when(true).then(() => {
          this.url = document.querySelector('#url').value;
          _loadUrl();
        });
      }
    };
  }

  module.exports = LibraryCaptureController;

})();

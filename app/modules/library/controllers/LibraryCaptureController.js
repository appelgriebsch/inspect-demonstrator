(function() {

  'use strict';

  function LibraryCaptureController($scope, $state, $q, $notification, ActivityService, DocumentCaptureService, LibraryDataService) {

    this.isBusy = false;
    this.document;
    this.url;
    this.statusMessage;

    var uuid = require('uuid').v1();
    var webViewer = document.getElementById('viewer');

    var setBusy = function(msg) {
      $q.when(true).then(() => {
        this.isBusy = true;
        this.statusMessage = msg;
      });
    }

    var setReady = function() {
      $q.when(true).then(() => {
        this.isBusy = false;
        this.statusMessage = '';
      });
    }

    $scope.$on('submit', (event, args) => {

      setBusy('Snapshotting Web Site...');

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
        setReady();
        $state.go('^.view');
      });

    });

    webViewer.addEventListener('load-commit', (evt) => {
      if (evt.isMainFrame) {
        $q.when(true).then(() => {
          this.url = evt.url;
        });
      }
    });

    webViewer.addEventListener('dom-ready', () => {
      webViewer.executeJavaScript(document.getElementById('capture-metadata').innerText);
    });

    webViewer.addEventListener('ipc-message', (evt, args) => {
      var doc = evt.channel;
      var today = new Date();
      doc.id = doc.title;
      doc.createdAt = today.toISOString();
      doc.type = 'website';
      $q.when(true).then(() =>{
        this.document = doc;
      });
    });

    this.openSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).addClass('sidebar-open');
        this.sidebarOpened = true;
      });
    };

    this.closeSidebar = function() {
      $q.when(true).then(() => {
        angular.element(document.querySelector('.sidebar')).removeClass('sidebar-open');
        this.sidebarOpened = false;
      });
    };

    this.getUniqueId = function() {
      return uuid;
    };

    this.initialize = function() {
      var init = [$notification.requestPermission(), ActivityService.initialize(), LibraryDataService.initialize()];
      return Promise.all(init);
    };

    this.loadUrl = (evt) => {

      if ((evt.keyCode) && (evt.keyCode == 13)) {
        $q.when(true).then(() => {
          webViewer.src = this.url;
        });
      }
      else if ((evt.type) && (evt.type === 'click')) {
        $q.when(true).then(() => {
          webViewer.src = this.url;
        });
      }
    };
  }

  module.exports = LibraryCaptureController;

})();

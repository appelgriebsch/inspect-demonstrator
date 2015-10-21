(function() {

  'use strict';

  function LibraryCaptureController($scope, $state, $q, $notification, ActivityService, DocumentCaptureService, LibraryDataService) {

    this.isBusy = false;
    this.document;
    this.url;
    this.statusMessage;

    var uuid = require('uuid').v1();
    var webViewer = document.getElementById('viewer');

    var setBusy = (msg) => {
      $q.when(true).then(() => {
        this.isBusy = true;
        this.statusMessage = msg;
      });
    };

    var setReady = () => {
      $q.when(true).then(() => {
        this.isBusy = false;
        this.statusMessage = '';
      });
    };

    $scope.$on('submit', (event, args) => {

      setBusy('Snapshotting Web Site...');

      DocumentCaptureService.captureWebSite(this.url).then((result) => {
        console.log(result);
      });
    });

    $scope.$on('cancel', (event, args) => {

      $q.when(true).then(() => {
        this.document = null;
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

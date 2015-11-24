(function(angular) {

  'use strict';

  function LibraryCaptureController($scope, $state, $q, DocumentCaptureService, LibraryDataService) {

    this.document;
    this.url = 'http://';

    var uuid = require('uuid').v1();
    var webViewer = document.getElementById('viewer');

    $scope.$on('submit', (event, args) => {

      $scope.setBusy('Snapshotting Web Site...');

      DocumentCaptureService.captureWebSite(this.url).then((result) => {

        this.document.meta.name = result.id;

        this.document.meta.thumbnailUrl.encodingFormat = 'image/png';
        this.document.meta.thumbnailUrl.contentUrl = result.preview;

        var _attachments = this.document._attachments || {};
        _attachments[result.id] = {
          content_type: result.content_type,
          data: result.data
        };

        this.document._attachments = _attachments;
        delete this.document.tags;

        LibraryDataService.save(this.document).then((result) => {

          var info = $scope.createEventFromTemplate('AddAction', 'public');
          info.description = `Web Site <i>${result.meta.name}</i> captured successfully!`;
          info.object = this.document.meta;
          delete info.result;

          $scope.writeLog('info', info).then(() => {
            $scope.notify('Document created successfully', info.description);
            this.document = null;
            this.url = 'http://';
            $scope.setReady(true);
            $state.go('^.view');
          });
        }).catch((err) => {
          $scope.setError('AddAction', 'public', err);
          $scope.setReady(true);
        });
      }).catch((err) => {
        $scope.setError('AddAction', 'public', err);
        $scope.setReady(true);
      });
    });

    $scope.$on('cancel', (event, args) => {
      $q.when(true).then(() => {
        this.document = null;
        this.url = 'http://';
        $scope.setReady(false);
        $state.go('^.view');
      });
    });

    webViewer.addEventListener('load-commit', (evt) => {
      if (evt.isMainFrame) {
        $q.when(true).then(() => {
          $scope.setBusy('Loading Web Site...');
          this.url = evt.url;
        });
      }
    });

    webViewer.addEventListener('dom-ready', () => {
      webViewer.executeJavaScript(document.getElementById('capture-metadata').innerText);
    });

    webViewer.addEventListener('ipc-message', (evt, args) => {
      var meta = evt.channel;
      var template = LibraryDataService.createMetadataFromTemplate('website');
      template.author = LibraryDataService.createMetadataFromTemplate('person');

      delete template.author.description;
      delete template.author.email;
      delete template.author.honorificPrefix;
      delete template.author.honorificSuffix;
      delete template.author.jobTitle;

      var author = meta.author.split(/\s*,\s*/);
      if (author.length > 1) {
        template.author.familyName = author[0];
        template.author.givenName = author[1];
        template.author.name = `${author[1]} ${author[0]}`;
      } else {
        author = meta.author.split(' ');
        template.author.name = meta.author;
        if (author.length > 0) {
          template.author.familyName = author[1];
          template.author.givenName = author[0];
        }
        else {
          delete template.author.familyName;
          delete template.author.givenName;
        }
      }

      template.datePublished = meta.publicationDate;
      template.description = meta.description;
      template.headline = meta.title;
      template.keywords = meta.tags.join(',');
      template.url = meta.url;

      $q.when(true).then(() => {
        this.document = {
          meta: template,
          status: 'new',
          tags: template.keywords.split(/\s*,\s*/)
        };
        $scope.setReady(true);
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
      var init = [LibraryDataService.initialize()];
      return Promise.all(init);
    };

    this.loadUrl = (evt) => {

      if ((evt.type) && (evt.type === 'submit')) {
        evt.preventDefault();
        $q.when(true).then(() => {
          webViewer.src = this.url;
        });
      }
    };
  }

  module.exports = LibraryCaptureController;

})(global.angular);

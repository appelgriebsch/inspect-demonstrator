(function() {

  'use strict';

  function LibraryWebViewerController($scope, $state, $stateParams, $q, $mdDialog, ActivityService, LibraryDataService, DocumentSharingService) {

    var remote = require('remote');
    var app = remote.require('app');
    var dialog = remote.require('dialog');

    var path = require('path');
    var fs = require('fs');

    var uuid = require('uuid').v1();
    var webViewer = document.getElementById('viewer');
    var docID = $stateParams.doc;

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

    this.document;
    this.action;
    this.sidebarOpened = false;
    this.isBusy = true;
    this.statusMessage = 'Loading Document...';

    this.initialize = function() {

      var ps = [LibraryDataService.initialize(), ActivityService.initialize()];

      Promise.all(ps).then(() => {
        return LibraryDataService.item(docID);
      }).then((result) => {
        var archive = result._attachments[result.id] || undefined;
        if (archive) {
          var fileName = path.join(app.getPath('temp'), `${result.id}.mhtml`);
          fs.writeFileSync(fileName, archive.data);
          webViewer.src = `file://${fileName}`;
        }
        result.custom_tags = result.custom_tags || [];
        result.annotations = result.annotations || [];
        this.document = result;
        setReady();
      });
    };

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

    $scope.$on('remove-document', (event, args) => {

      var confirm = $mdDialog.confirm()
        .title('Would you like to delete this document?')
        .content(this.document.title)
        .targetEvent(args)
        .ok('Yes, delete it')
        .cancel('No, please keep it');

      $mdDialog.show(confirm).then(() => {

        LibraryDataService.delete(this.document).then(() => {

          var details = angular.copy(this.document);
          details.status = 'deleted';
          delete details._attachments;
          delete details.preview;

          var info = {
            type: 'delete',
            id: details._id,
            details: details
          };

          ActivityService.addWarning(info).then(() => {
            $state.go('^.view');
          });

        });
      });
    });

    $scope.$on('export-document', (event, args) => {

      var targetPath = dialog.showOpenDialog(app.getMainWindow(), {
        title: 'Please select destination folder:',
        defaultPath: app.getPath('home'),
        properties: ['openDirectory', 'createDirectory']
      });

      if (targetPath !== undefined) {
        this.isBusy = true;
        this.statusMessage = 'Exporting Document...';
        DocumentSharingService.export([this.document], targetPath[0]).then((result) => {

          var details = angular.copy(this.document);
          delete details._attachments;
          delete details.preview;

          angular.merge(details, result);

          var info = {
            type: 'export',
            id: details._id,
            details: details
          };

          this.isBusy = false;
          return ActivityService.addInfo(info);
        });
      }
    });
  }

  module.exports = LibraryWebViewerController;

})();

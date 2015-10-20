(function() {

  'use strict';

  function LibraryViewController($scope, $state, $q, LibraryDataService, DocumentSharingService, ActivityService) {

    var remote = require('remote');
    var app = remote.require('app');
    var dialog = remote.require('dialog');

    var setBusy = function(msg) {
      $q.when(true).then(() => {
        this.isBusy = true;
        this.statusMessage = msg;
      });
    }.bind(this);

    var setReady = function() {
      $q.when(true).then(() => {
        this.isBusy = false;
        this.statusMessage = '';
      });
    }.bind(this);

    this.items = [];
    this.isBusy = false;
    this.statusMessage = '';

    this.initialize = function() {

      var init = [ActivityService.initialize(), LibraryDataService.initialize()];
      Promise.all(init).then(() => {
        return LibraryDataService.library().then((result) => {
          $q.when(true).then(() => {
            result.rows.forEach((item) => {
              this.items.push(item.doc);
            });
          });
        });
      });
    };

    this.selectItem = function(item) {

      var idx = this.items.indexOf(item);
      if (idx === -1) return;

      $q.when(true).then(() => {
        item.isSelected = !item.isSelected;
        this.items[idx] = item;
      });
    };

    $scope.$on('import-documents', () => {

      var targetPath = dialog.showOpenDialog(app.getMainWindow(), {
        title: 'Please select target folder:',
        defaultPath: app.getPath('home'),
        properties: ['openDirectory']
      });

      if (targetPath !== undefined) {

        setBusy('Importing Document(s)...');

        DocumentSharingService.import(targetPath[0]).then((results) => {

          results.forEach((result) => {

            LibraryDataService.save(result).then(() => {

              var doc = angular.copy(result);
              delete doc._attachments;
              delete doc.preview;

              var info = {
                type: 'import',
                id: doc._id,
                details: doc
              };

              return ActivityService.addInfo(info);
            }).then(() => {
              this.items.push(result);
              setReady();
            });
          });
        });
      }
    });

    $scope.$on('export-documents', () => {

      var targetPath = dialog.showOpenDialog(app.getMainWindow(), {
        title: 'Please select destination folder:',
        defaultPath: app.getPath('home'),
        properties: ['openDirectory', 'createDirectory']
      });

      if (targetPath !== undefined) {

        setBusy('Exporting Document(s)...');

        DocumentSharingService.export(this.items, targetPath[0]).then((results) => {

          var p = [];

          results.forEach((result) => {

            var doc = angular.copy(result.doc);
            doc.target = result.target;

            delete doc._attachments;
            delete doc.preview;

            var info = {
              type: 'export',
              id: doc._id,
              details: doc
            };

            p.push(ActivityService.addInfo(info));

          });

          return Promise.all(p);

        }).then(() => {
          setReady();
        });
      }
    });
  }

  module.exports = LibraryViewController;

})();

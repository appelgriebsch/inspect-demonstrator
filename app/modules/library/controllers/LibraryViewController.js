(function(angular) {

  'use strict';

  function LibraryViewController($scope, $state, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

    this.items = [];

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];
      Promise.all(init).then(() => {
        return LibraryDataService.library();
      }).then((result) => {
        $q.when(true).then(() => {
          result.rows.forEach((item) => {
            if (Array.isArray(item.doc.author)) {
              item.doc.author = item.doc.author.join(', ');
            }
            this.items.push(item.doc);
          });
        });
      });
    };

    $scope.$on('import-documents', () => {

      var files = DocumentSharingService.requestFiles();

      if (files !== undefined) {

        $scope.setBusy('Importing Document(s)...');

        var p = [];

        DocumentSharingService.import(files).then((results) => {

          results.forEach((result) => {

            LibraryDataService.save(result).then(() => {

              var info = angular.copy(result);
              info.type = 'import';
              info.icon = 'import_export';
              info.description = `Document <i>${result.title}</i> has been imported successfully.`;

              delete info._attachments;
              delete info.preview;

              this.items.push(result);
              p.push($scope.writeLog('info', info));

            }).catch((error) => {
              $scope.setError('Import Documents', 'import_export', err);
              $scope.setReady(true);
            });
          });

          return Promise.all(p);

        }).then((results) => {
          $scope.notify('Import finished successfully', `${results.length} documents have been imported successfully.`);
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('Import Documents', 'import_export', err);
          $scope.setReady(true);
        });
      }
    });

    $scope.$on('export-documents', () => {

      var targetPath = DocumentSharingService.requestFolder();

      if (targetPath !== undefined) {

        $scope.setBusy('Exporting Document(s)...');

        DocumentSharingService.export(this.items, targetPath).then((results) => {

          var p = [];

          results.forEach((result) => {

            var info = angular.copy(result.doc);
            info.target = result.target;
            info.type = 'export';
            info.icon = 'share';
            info.description = `Document <i>${info.title}</i> has been exported successfully.`;

            delete info._attachments;
            delete info.preview;

            p.push($scope.writeLog('info', info));
          });

          return Promise.all(p);

        }).then((results) => {
          $scope.notify('Export finished successfully', `${results.length} documents have been exported successfully.`);
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('Export Documents', 'share', err);
          $scope.setReady(true);
        });
      }
    });
  }

  module.exports = LibraryViewController;

})(global.angular);

(function(angular) {

  'use strict';

  function LibraryViewController($scope, $state, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

    this.items = [];

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];
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

      var targetPath = DocumentSharingService.requestFolder();

      if (targetPath !== undefined) {

        $scope.setBusy('Importing Document(s)...');

        DocumentSharingService.import(targetPath).then((results) => {

          results.forEach((result) => {

            LibraryDataService.save(result).then(() => {

              var info = angular.copy(result);
              info.type = 'import';
              info.icon = 'import_export';
              info.description = `<i>${result.title}</i> has been imported successfully.`;

              delete info._attachments;
              delete info.preview;

              return $scope.writeLog('info', info);
            }).then(() => {
              this.items.push(result);
              $scope.setReady();
            });
          });
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
            info.icon = 'import_export';
            info.description = `<i>${info.title}</i> has been exported successfully.`;

            delete info._attachments;
            delete info.preview;

            p.push($scope.writeLog('info', info));
          });

          return Promise.all(p);

        }).then(() => {
          $scope.setReady();
        });
      }
    });
  }

  module.exports = LibraryViewController;

})(global.angular);

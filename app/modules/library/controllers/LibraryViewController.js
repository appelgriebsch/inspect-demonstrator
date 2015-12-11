(function(angular) {

  'use strict';

  function LibraryViewController($scope, $state, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

    this.items = [];
    this.query = '';
    this.state = $state.$current;
    this.baseState = this.state.parent.toString();

    var _doSearch = () => {

      this.items = [];

      $scope.setBusy('Searching documents...');

      LibraryDataService.search(this.query).then((results) => {

        $q.when(true).then(() => {
          results.rows.forEach((item) => {
            if (Array.isArray(item.doc.author)) {
              item.doc.author = item.doc.author.join(', ');
            }
            this.items.push(item.doc);
          });
        });

        $scope.setReady(false);

      }).catch((err) => {
        $scope.setError('SearchAction', 'search', err);
        $scope.setReady(true);
      });
    };

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

    this.search = (evt) => {

      if ((evt) && (evt.keyCode !== 13)) {
        return;
      }
      else {
        $q.when(true).then(() => {
          _doSearch();
        });
      }
    };

    this.reset = () => {
      $q.when(true).then(() => {
        this.query = '';
        _doSearch();
      });
    };

    $scope.$on('import-documents', () => {

      var files = DocumentSharingService.requestFiles({
        name: 'Document Archive',
        extensions: ['archive']
      });

      if (files !== undefined) {

        $scope.setBusy('Importing Document(s)...');

        var p = [];

        DocumentSharingService.import(files).then((results) => {

          results.forEach((result) => {

            var ps = LibraryDataService.save(result).then(() => {

              var info = $scope.createEventFromTemplate('ReceiveAction', 'import_export');
              info.description = `Document <i>${result.meta.name}</i> has been imported successfully.`;
              info.object = result.meta;
              delete info.result;

              this.items.push(result);
              return $scope.writeLog('info', info);

            }).catch((err) => {
              $scope.setError('ReceiveAction', 'import_export', err);
              $scope.setReady(true);
            });

            p.push(ps);

          });

          return Promise.all(p);

        }).then((results) => {
          $scope.notify('Import finished successfully', `${results.length} documents have been imported successfully.`);
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('ReceiveAction', 'import_export', err);
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

            var info = $scope.createEventFromTemplate('SendAction', 'share');
            info.description = `Document <i>${result.doc.meta.name}</i> has been exported successfully.`;
            info.object = result.doc.meta;
            info.result = result;

            p.push($scope.writeLog('info', info));

          });

          return Promise.all(p);

        }).then((results) => {
          $scope.notify('Export finished successfully', `${results.length} documents have been exported successfully.`);
          $scope.setReady();
        }).catch((err) => {
          $scope.setError('SendAction', 'share', err);
          $scope.setReady(true);
        });
      }
    });
  }

  module.exports = LibraryViewController;

})(global.angular);

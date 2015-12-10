(function(angular) {

  'use strict';

  function LibrarySearchController($scope, $state, $q, $mdDialog, DocumentSharingService, LibraryDataService) {

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

    this.initialize = function() {

      var init = [LibraryDataService.initialize()];
      return Promise.all(init);
    };

    this.search = (evt) => {

      if ((evt.type) && (evt.type === 'submit')) {
        evt.preventDefault();
        $q.when(true).then(() => {
          _doSearch();
        });
      }
    };
  }

  module.exports = LibrarySearchController;

})(global.angular);

(function(angular) {

  'use strict';

  function LibraryEditMetaController($scope, $state, $stateParams, $q, LibraryDataService) {

    var docID = $stateParams.doc;

    this.document = {
      tags: []
    };

    $scope.$on('submit', (evt, args) => {

      $scope.setBusy('Saving changes...');

      this.document.meta.keywords = this.document.tags.length > 0 ? this.document.tags.join(',') : this.document.meta.keywords;
      this.document.meta.datePublished = this.document.datePublished ? this.document.datePublished.toISOString() : this.document.meta.datePublished;
      delete this.document.datePublished;

      var author = LibraryDataService.buildAuthorInformation(this.document.meta.author.name);
      this.document.meta.author = author;

      LibraryDataService.save(this.document).then((result) => {

        var info = $scope.createEventFromTemplate('AddAction', 'mode_edit');
        info.description = `Document <i>${this.document.meta.name}</i> updated successfully!`;
        info.object = this.document.meta;
        delete info.result;

        $scope.writeLog('info', info).then(() => {
          $scope.notify('Document updated successfully', info.description);
          $scope.setReady(true);
          if (this.document.meta['@type'] === 'WebSite') {
            $state.go('^.webview', { doc: this.document._id });
          } else {
            $state.go('^.pdfview', { doc: this.document._id });
          }
        });
      }).catch((err) => {
        $scope.setError('AddAction', 'mode_edit', err);
        $scope.setReady(true);
      });
    });

    $scope.$on('cancel', () => {
      $q.when(true).then(() => {
        $scope.setReady(false);
        if (this.document.meta['@type'] === 'WebSite') {
          $state.go('^.webview', { doc: this.document._id });
        } else {
          $state.go('^.pdfview', { doc: this.document._id });
        }
      });
    });

    this.initialize = function() {

      var ps = [LibraryDataService.initialize()];

      $scope.setBusy('Loading Document Information...');

      Promise.all(ps).then(() => {

        return LibraryDataService.item(docID);

      }).then((result) => {

        result.datePublished = result.meta.datePublished ? new Date(result.meta.datePublished) : null,
        result.tags = result.meta.keywords ? result.meta.keywords.split(/\s*,\s*/) : [];

        $q.when(true).then(() => {
          this.document = result;
          $scope.setReady(true);
        });
      });
    };
  }

  module.exports = LibraryEditMetaController;

})(global.angular);

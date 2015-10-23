(function(angular) {

  'use strict';

  function LibraryUploadController($scope, $state, $q, DocumentCaptureService, LibraryDataService) {

    var fileSelector;
    this.files = [];

    $scope.$on('submit', (evt, args) => {

      $scope.setBusy('Uploading Files...');

    });

    $scope.$on('cancel', () => {
      $q.when(true).then(() => {
        this.files = [];
        $scope.setReady(false);
        $state.go('^.view');
      });
    });

    this.initialize = function() {
      var init = [LibraryDataService.initialize()];
      return Promise.all(init);
    };

    this.selectItem = function(item) {

      var idx = this.files.indexOf(item);
      var selected = this.files[idx].isSelected;

      $q.when(true).then(() => {
        this.files[idx].isSelected = !selected;
      });
    };

    this.showFileSelector = function() {

      if (!fileSelector) {

        fileSelector = document.getElementById('fileSelector');

        fileSelector.onchange = (e) => {
          $q.when(true).then(() => {
            this.addFiles(e.target.files);
          });
        };
      }

      $q.when(true).then(() => {
        fileSelector.click();
      });
    };

    this.downloadFile = function(evt) {

      evt.preventDefault();

    };

    this.addFiles = function(files) {

      var newRequests = [];

      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var uploadRequest = {
          type: 'file',
          name: file.name,
          mime: file.type,
          size: file.size,
          status: 'unknown',
          url: `file:///${file.path}`
        };
        newRequests.push(uploadRequest);
        this.files.push(uploadRequest);
      }

      var p = [];

      newRequests.forEach((file) => {
        p.push(DocumentCaptureService.capturePDF(file));
      });

      Promise.all(p).then((results) => {

        console.log(results);

        results.forEach((result) => {

          var idx = this.files.findIndex((elem) => {
            return (result.url === elem.url);
          });

          if (idx !== -1) {
            var request = this.files[idx];
            angular.merge(request, result);
            request.title = request.title || request.name;
            request.status = 'ready';
          }
        });
      }).catch((err) => {
        $scope.setError(err);
      });
    };
  }

  module.exports = LibraryUploadController;

})(global.angular);

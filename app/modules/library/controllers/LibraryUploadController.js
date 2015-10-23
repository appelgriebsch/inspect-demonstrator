(function(angular) {

  'use strict';

  function LibraryUploadController($scope, $state, $q, DocumentCaptureService, LibraryDataService) {

    var fileSelector;
    this.files = [];

    $scope.$on('submit', (evt, args) => {

      $scope.setBusy('Uploading Files...');
      var p = [];

      this.files.forEach((file) => {

        var fp = DocumentCaptureService.requestFileData(file).then((data) => {

          var attachments = file._attachments || {};
          attachments[file.attachment.id] = {
            content_type: file.attachment.content_type,
            data: data
          };

          file._id = file.title;
          file._attachments = attachments;

          delete file.attachment;
          delete file.path;
          delete file.mime;
          delete file.size;

          return LibraryDataService.save(file).then((result) => {

            var info = angular.copy(file);
            delete info._attachments;
            delete info.preview;

            info._id = result.id;
            info._rev = result.rev;
            info.icon = 'file_upload';
            info.description = `Document <i>${info.title}</i> uploaded successfully!`;

            return $scope.writeLog('info', info);
          });
        }).catch((err) => {
          $scope.setError(err);
        });

        p.push(fp);

      });

      Promise.all(p).then((results) => {
        $scope.notify('Documents created successfully', `${results.length} documents have been uploaded.`);
        this.files = [];
        $scope.setReady(false);
        $state.go('^.view');
      });
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
          name: file.name,
          mime: file.type,
          size: file.size,
          status: 'unknown',
          path: file.path,
          url: `file:///${file.path}`
        };
        newRequests.push(uploadRequest);
        this.files.push(uploadRequest);
      }

      $scope.setBusy('Analyzing files...');

      var p = [];

      newRequests.forEach((file) => {
        p.push(DocumentCaptureService.capturePDF(file));
      });

      Promise.all(p).then((results) => {

        results.forEach((result) => {

          var idx = this.files.findIndex((elem) => {
            return (result.url === elem.url);
          });

          if (idx !== -1) {
            var request = this.files[idx];
            angular.merge(request, result);
            request.status = 'ready';
          }
        });

        $scope.setReady(true);

      }).catch((err) => {
        $scope.setError(err);
      });
    };
  }

  module.exports = LibraryUploadController;

})(global.angular);

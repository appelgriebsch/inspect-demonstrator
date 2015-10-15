(function() {

  'use strict';

  function LibraryUploadController($scope, $state, $q, $notification, ActivityService, FileUploadService) {

    var remote = require('remote');
    var app = remote.require('app');

    var dropZone, fileSelector;

    var calcUnitSize = function(fileSize) {

      var result = {
        unit: 'bytes',
        number: fileSize
      };

      if (fileSize > (1024 * 1024)) {
        result.number = Math.round(fileSize / (1024 * 1024));
        result.unit = 'mb';
      } else if (fileSize > 1024) {
        result.number = Math.round(fileSize / 1024);
        result.unit = 'kb';
      }

      return result;
    };

    $scope.$on('submit', (event, args) => {

      this.isBusy = true;

      FileUploadService.upload(this.files)
        .then((uploadedFiles) => {

          var info = uploadedFiles.map(function(uploadedFile) {
            return {
              file: 1,
              size: uploadedFile.file.size
            };
          }).reduce(function(sum, elem) {
            return {
              files: sum.files + elem.file,
              size: sum.size + elem.size
            };
          }, {
            files: 0,
            size: 0
          });

          info.type = 'upload';
          info.details = uploadedFiles;
          info.displaySize = calcUnitSize(info.size);

          $notification('Files uploaded', {
            body: `${info.files} file(s) (${info.displaySize.number} ${info.displaySize.unit}) have been uploaded.`,
            delay: 2000
          });

          ActivityService.addInfo(info).then(() => {
            $q.when(true).then(() => {
              this.isBusy = false;
              $state.go('^.view');
            });
          });
        });
    });

    $scope.$on('cancel', (event, args) => {

      $q.when(true).then(() => {
        this.files = [];
        this.isBusy = false;
        $state.go('^.view');
      });

    });

    this.files = [];
    this.isBusy = false;

    this.initialize = function() {

      dropZone = document.querySelector('#dropZone');
      fileSelector = document.querySelector('#fileSelector');

      fileSelector.onchange = (e) => {
        $q.when(true).then(() => {
          this.addFiles(e.target.files);
        });
      };

      dropZone.ondragover = (e) => {
        e.dataTransfer.dropEffect = 'copy';
        return false;
      };

      dropZone.ondragleave = dropZone.ondragend = function() {
        return false;
      };

      dropZone.ondrop = (e) => {
        e.preventDefault();
        var files = e.dataTransfer.files;
        console.log('dropped:', files);
        $q.when(true).then(() => {
          this.addFiles(files);
        });
        return false;
      };

      $notification.requestPermission().then(() => {
        return ActivityService.initialize();
      });
    };

    this.selectItem = function(item) {

      var idx = this.files.indexOf(item);
      var selected = this.files[idx].isSelected;

      $q.when(true).then(() => {
        this.files[idx].isSelected = !selected;
      });
    };

    this.showFileSelector = function() {
      $q.when(true).then(() => {
        fileSelector.click();
      });
    };

    this.addFiles = function(files) {

      var newRequests = [];

      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var uploadRequest = {
          name: file.name,
          path: file.path,
          mime: file.type,
          size: file.size,
          status: 'unknown'
        };
        newRequests.push(uploadRequest);
        this.files.push(uploadRequest);
      }

      newRequests.forEach((request) => {
        app.pdfViewerService().preview({
          id: request.name,
          path: request.path
        }).then((result) => {
          $q.when(true).then(() => {
            angular.merge(request, result);
            request.status = 'ready';
            request.type = 'document';
          });
        });
      });
    };
  }

  module.exports = LibraryUploadController;

})();

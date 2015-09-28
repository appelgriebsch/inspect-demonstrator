(function() {

  'use strict';

  function LibraryUploadController($scope, $state, $q, ActivityService, FileSystemService, FileUploadService) {

    this.files = [];
    var dropZone, fileSelector, folderSelector;

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

    this.initialize = function() {

      dropZone = document.querySelector('#dropZone');
      fileSelector = document.querySelector('#fileSelector');
      folderSelector = document.querySelector('#folderSelector');

      fileSelector.onchange = (e) => {
        $q.when(true).then(() => {
          this.addFiles(e.target.files);
        });
      };

      folderSelector.onchange = (e) => {
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
        $q.when(true).then(() => {
          this.addFiles(files);
        });
        return false;
      };

      $scope.$on('submit', (event, args) => {

        var notifier = require('node-notifier');

        FileUploadService.upload(this.files)
          .then((uploadedFiles) => {

            var info = uploadedFiles.map(function(uploadedFile) {
              return {
                file: (uploadedFile.file.info.type === 'folder' ? uploadedFile.file.info.noOfFiles : 1),
                size: uploadedFile.file.info.size
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
            info.details = angular.copy(uploadedFiles);
            info.displaySize = calcUnitSize(info.size);

            notifier.notify({
              title: 'Files uploaded',
              message: `${info.files} file(s) (${info.displaySize.number} ${info.displaySize.unit}) have been uploaded.`
            });

            ActivityService.addInfo(info).then(() => {
              $q.when(true).then(() => {
                $state.go('^.view');
              });
            });
          });
      });

      return ActivityService.initialize();
    };

    this.selectFile = function() {
      $q.when(true).then(() => {
        fileSelector.click();
      });
    };

    this.selectFolder = function() {
      $q.when(true).then(() => {
        folderSelector.click();
      });
    };

    this.addFiles = function(files) {

      var newRequests = [];

      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var uploadRequest = {
          name: file.name,
          path: file.path,
          status: 'unknown'
        };
        newRequests.push(uploadRequest);
        this.files.push(uploadRequest);
      }

      return FileSystemService.examine(newRequests);
    };
  }

  module.exports = LibraryUploadController;

})();

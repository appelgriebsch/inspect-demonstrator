(function() {

  'use strict';

  function LibraryUploadController($scope, $q, ActivityService, FileSystemService, FileUploadService) {

    this.files = [];
    var dropZone, fileSelector, folderSelector;

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

        console.log('submit', event, args);

        var info = this.files.map(function(file) {
          return {
            file: (file.info.type === 'folder' ? file.info.noOfFiles : 1)
          };
        }).reduce(function(sum, elem) {
          return {
            files: sum.files + elem.file
          };
        }, {
          files: 0
        });

        info.type = 'upload';
        info.details = angular.copy(this.files);

        $q.when(ActivityService.addInfo(info))
          .then(() => {
            return FileUploadService.upload(this.files);
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
          status: 'unknown',
          uploadProgress: 0
        };
        newRequests.push(uploadRequest);
        this.files.push(uploadRequest);
      }

      return FileSystemService.examine(newRequests);
    };
  }

  module.exports = LibraryUploadController;

})();

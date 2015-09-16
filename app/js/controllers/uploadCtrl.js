(function() {

  'use strict';

  angular.module('inspectApp').controller('UploadController', ['$state', '$log', '$q', 'LogService', 'UploadService', UploadController]);

  function UploadController($state, $log, $q, logService, uploadService) {

    var fs = require('fs');
    var path = require('path');
    var mime = require('mime');

    var remote = require('remote');
    var dialog = remote.require('dialog');

    this.files = [];

    this.initialize = function() {

      var dropZone = document.querySelector('#dropZone');

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

      return logService.initialize();

    };

    this.selectFile = function() {
      var files = dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      }) || [];
      $q.when(true).then(() => {
        this.addFiles(files);
      });
    };

    this.selectFolder = function() {
      var files = dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
      }) || [];
      $q.when(true).then(() => {
        this.addFiles(files);
      });
    };

    this.addFiles = function(files) {
      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var uploadRequest = {};
        var fInfo, mimeInfo;
        if (typeof file === 'string') {
          fInfo = fs.statSync(file);
          mimeInfo = mime.lookup(file);
          uploadRequest = {
            type: fInfo.isDirectory() ? 'folder' : 'file',
            mime: mimeInfo,
            size: fInfo.size,
            info: fInfo.isDirectory() ? fs.readdirSync(file).length + ' files' : fInfo.size + ' bytes',
            name: path.basename(file),
            path: file,
            uploadProgress: 0
          };
        } else {
          fInfo = fs.statSync(file.path);
          mimeInfo = mime.lookup(file.path);
          uploadRequest = {
            type: fInfo.isDirectory() ? 'folder' : 'file',
            mime: mimeInfo,
            size: file.size,
            info: fInfo.isDirectory() ? fs.readdirSync(file.path).length + ' files' : file.size + ' bytes',
            name: file.name,
            path: file.path,
            uploadProgress: 0
          };
        }
        this.files.push(uploadRequest);
      }
    };

    this.submit = function() {

      var info = this.files.map(function(file) {
        return {
          file: (file.type == 'folder' ? 0 : 1),
          folder: (file.type == 'file' ? 0 : 1)
        };
      }).reduce(function(sum, elem) {
        return {
          files: sum.files + elem.file,
          folders: sum.folders + elem.folder
        };
      }, { files: 0, folders: 0 });

      info.type = 'upload';
      info.details = angular.copy(this.files);

      $q.when(logService.addInfo(info))
        .then(() => {
          return uploadService.upload(this.files);
        });
    };
  }

})();

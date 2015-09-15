(function() {

  'use strict';

  angular.module('inspectApp').controller('UploadController', ['$state', '$log', '$q', 'AuditService', UploadController]);

  function UploadController($state, $log, $q, AuditService) {

    var self = this;
    var fs = require('fs');
    var path = require('path');
    var mime = require('mime');

    var remote = require('remote');
    var dialog = remote.require('dialog');

    self.files = [];

    self.initialize = function() {

      var dropZone = document.querySelector('#dropZone');

      dropZone.ondragover = function(e) {
        e.dataTransfer.dropEffect = 'copy';
        return false;
      };

      dropZone.ondragleave = dropZone.ondragend = function() {
        return false;
      };

      dropZone.ondrop = function(e) {
        e.preventDefault();
        var files = e.dataTransfer.files;
        $q.when(true).then(function() {
          self.addFiles(files);
        });
        return false;
      };

      return AuditService.initialize();

    };

    self.selectFile = function() {
      var files = dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      }) || [];
      $q.when(true).then(function() {
        self.addFiles(files);
      });
    };

    self.selectFolder = function() {
      var files = dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
      }) || [];
      $q.when(true).then(function() {
        self.addFiles(files);
      });
    };

    self.addFiles = function(files) {
      for (var i = 0; i < files.length; ++i) {
        var file = files[i];
        var uploadRequest = {};
        if (typeof file === "string") {
          var fInfo = fs.statSync(file);
          var mimeInfo = mime.lookup(file);
          uploadRequest = {
            type: fInfo.isDirectory() ? "folder" : "file",
            mime: mimeInfo,
            size: fInfo.size,
            info: fInfo.isDirectory() ? fs.readdirSync(file).length + ' files' : fInfo.size + ' bytes',
            name: path.basename(file),
            path: file,
            uploadProgress: 0
          };
        } else {
          var fInfo = fs.statSync(file.path);
          var mimeInfo = mime.lookup(file.path);
          uploadRequest = {
            type: fInfo.isDirectory() ? "folder" : "file",
            mime: mimeInfo,
            size: file.size,
            info: fInfo.isDirectory() ? fs.readdirSync(file.path).length + ' files' : file.size + ' bytes',
            name: file.name,
            path: file.path,
            uploadProgress: 0
          };
        }
        self.files.push(uploadRequest);
      }
    };

    self.submit = function() {
      console.log(self.files);
      for (var i = 0; i < self.files.length; ++i) {
        AuditService.addEvent({
          type: 'Upload',
          name: self.files[i].path
        });
      }
    };
  };

})();

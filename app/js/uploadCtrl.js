(function() {

  'use strict';

  angular.module('inspectApp').controller('UploadController', ['$state', '$log', '$q', UploadController]);

  function UploadController($state, $log, $q) {

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

          for (var i = 0; i < files.length; ++i) {

            var file = files[i];
            var fInfo = fs.statSync(file.path);

            self.files.push({
              type: fInfo.isDirectory() ? "folder" : "file",
              mime: file.type,
              size: file.size,
              name: file.name,
              path: file.path,
              uploadProgress: 0
            });
          }
        });
        return false;
      };
    };

    self.selectFile = function() {

      var files = dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      }) || [];

      $q.when(true).then(function() {
        for (var i = 0; i < files.length; ++i) {
          var file = files[i];
          var fInfo = fs.statSync(file);
          var mimeInfo = mime.lookup(file);

          self.files.push({
            type: fInfo.isDirectory() ? "folder" : "file",
            mime: mimeInfo,
            size: fInfo.size,
            name: path.basename(file),
            path: file,
            uploadProgress: 0
          });
        }
      });
    };

    self.selectFolder = function() {

      var files = dialog.showOpenDialog({
        properties: ['openDirectory', 'multiSelections']
      }) || [];

      $q.when(true).then(function() {
        for (var i = 0; i < files.length; ++i) {
          var file = files[i];
          var fInfo = fs.statSync(file);
          var mimeInfo = mime.lookup(file);

          self.files.push({
            type: fInfo.isDirectory() ? "folder" : "file",
            mime: mimeInfo,
            size: fInfo.size,
            name: path.basename(file),
            path: file,
            uploadProgress: 0
          });
        }
      });
    };

    self.submit = function() {
      console.log(self.files);
    };
  };

})();

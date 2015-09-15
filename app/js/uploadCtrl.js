(function() {

  'use strict';

  angular.module('inspectApp').controller('UploadController', ['$state', '$log', '$q', UploadController]);

  function UploadController($state, $log, $q) {

    var self = this;
    var fs = require('fs');

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
        };
        return false;
      };
    };

    self.submit = function() {
      console.log(self.files);
    };
  };

})();

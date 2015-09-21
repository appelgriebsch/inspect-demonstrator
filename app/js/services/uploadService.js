(function() {

  'use strict';

  angular.module('inspectApp').service('UploadService', ['$q', UploadService]);

  function FileUploader(file, $q) {

    var reader = new FileReader();

    reader.onprogress = (evt) => {

      $q.when(true).then(() => {

        file.uploadProgress += Math.round(evt.loaded * 100 / evt.total);
      });
    };

    return {

      upload: function() {

        var promise = new Promise((resolve, reject) => {

          reader.onerror = (evt) => {
            reject(evt.target.error);
          };

          reader.onload = (evt) => {
            resolve({
              file: file,
              result: evt.target.result
            });
          };

          reader.readAsArrayBuffer(file.raw);

        });

        return promise;
      }
    };
  }

  function FolderUploader(folder, $q) {

    return {

      upload: function() {

        console.log(folder);
        var promise = new Promise((resolve, reject) => {


        });

        return promise;
      }
    };
  }

  function UploadService($q) {

    return {

      upload: function(files) {

        for (var i = 0; i < files.length; ++i) {

          var file = files[i];
          var uploader;

          if (file.status === 'uploaded') {
            continue;
          }

          switch (file.info.type) {
            case "folder":
              uploader = new FolderUploader(file, $q);
              break;
            case "file":
              uploader = new FileUploader(file, $q);
              break;
          }

          uploader.upload().then((result) => {
            console.log(result);
            result.file.status = 'uploaded';
          }).catch((err) => {
            console.log(err);
          });
        }
      }
    };
  }

})();

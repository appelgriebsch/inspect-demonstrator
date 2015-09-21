(function() {

  'use strict';

  angular.module('inspectApp').service('UploadService', ['$q', 'PouchDBService', UploadService]);

  function FileUploader(file, db, $q) {

    var fs = require('fs');

    return {

      upload: function() {

        var promise = new Promise((resolve, reject) => {

          fs.readFile(file.path, (err, result) => {

            if (err) {
              reject(err);
            }

            var _attachments = {};

            _attachments[file.name] = {
              'content_type': (file.info ? file.info.mime : file.mime),
              'data': result
            };

            console.log(_attachments);

            db.post({
                _attachments: _attachments
              })
              .then((doc) => {
                resolve({
                  file: file,
                  doc: doc
                });
              }).catch((err) => {
                reject(err);
              });
          });
        });

        return promise;
      }
    };
  }

  function FolderUploader(folder, db, $q) {

    return {

      upload: function() {

        var promise = new Promise((resolve, reject) => {

          var received = 0;
          var count = folder.info.subitems.length;

          for (var i = 0; i < count; ++i) {

            var file = folder.info.subitems[i];
            var fileUploader = new FileUploader(file, db, $q);

            fileUploader.upload().then((result) => {

              console.log(result);

              received += 1;

              $q.when(true).then(() => {
                folder.uploadProgress = Math.round(received * 100 / count);
              });

              if (received == (count - 1)) {
                resolve({
                  file: folder
                });
              }

            }).catch((err) => {
              reject(err);
            });
          }
        });

        return promise;
      }
    };
  }

  function UploadService($q, PouchDBService) {

    var db = PouchDBService.initialize('library');

    return {

      upload: function(files) {

        for (var i = 0; i < files.length; ++i) {

          var file = files[i];
          var uploader;

          if (file.status === 'uploaded') {
            continue;
          }

          switch (file.info.type) {
          case 'folder':
            uploader = new FolderUploader(file, db, $q);
            break;
          case 'file':
            uploader = new FileUploader(file, db, $q);
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

(function() {

  'use strict';

  function FileUploadService($q, PouchDBService) {

    function FileUploader(file, db, $q) {
      var fs = require('fs');
      var remote = require('remote');
      var app = remote.require('app');
      var sysCfg = app.sysConfig();

      var _prefill = function(upload) {

        var doc = angular.copy(upload);
        var today = new Date();

        doc.createdAt = today.toISOString();
        doc.createdBy = sysCfg.user;
        doc.createdOn = sysCfg.host;

        return doc;
      };

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

              var doc = _prefill({
                _attachments: _attachments,
                filename: file.name,
                status: 'uploaded',
                type: 'document'
              });
              db.post(doc)
                .then((result) => {
                  file.status = 'uploaded';
                  resolve({
                    file: file,
                    result: result
                  });
                }).catch((err) => {
                  file.status = 'error';
                  reject({
                    result: err,
                    file: file
                  });
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

                received += 1;

                if (received == count) {
                  folder.status = 'uploaded';
                  resolve({
                    file: folder
                  });
                }

              }).catch((err) => {
                folder.status = 'error';
                reject({
                  result: err,
                  file: folder
                });
              });
            }
          });

          return promise;
        }
      };
    }

    var db = PouchDBService.initialize('library');

    var uploader = function(requests) {

      var promise = new Promise((resolve, reject) => {

        var count = requests.length;
        var handledRequests = 0;
        var uploaded = [];

        for (var i = 0; i < count; ++i) {

          var file = requests[i];
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

            handledRequests += 1;
            uploaded.push(result);

            if (handledRequests == count) {
              resolve(uploaded);
            }
          }).catch((err) => {
            handledRequests += 1;
            console.log(err);
          });
        }
      });

      return promise;
    };

    return {

      upload: function(requests) {

        return uploader(requests);
      }
    };
  }

  module.exports = FileUploadService;

})();

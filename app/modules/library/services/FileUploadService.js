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
                'content_type': file.mime,
                'data': result
              };

              var doc = _prefill({
                _attachments: _attachments,
                info: file.info,
                title: file.info.title,
                filename: file.name,
                preview: file.preview,
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

    var db = PouchDBService.initialize('library');

    var uploader = function(requests) {

      var promise = new Promise((resolve, reject) => {

        var count = requests.length;
        var handledRequests = 0;
        var uploaded = [];

        for (var i = 0; i < count; ++i) {

          var file = requests[i];

          if (file.status === 'uploaded') {
            continue;
          }

          var uploader = new FileUploader(file, db, $q);

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

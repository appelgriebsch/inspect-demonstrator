(function() {

  'use strict';

  function FileSystemService($q) {

    var fs = require('fs');
    var path = require('path');
    var mime = require('mime');

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

    var examineFile = function(file) {

      var promise = new Promise((resolve, reject) => {

        fs.stat(file, (err, info) => {

          if (err) {
            reject(err);
          }

          var result = {
            type: 'file',
            noOfFiles: 1,
            name: path.basename(file),
            path: file,
            mime: mime.lookup(file),
            last_accessed: info.atime,
            last_modified: info.mtime,
            created: info.birthtime,
            size: info.size,
            display_size: calcUnitSize(info.size)
          };

          resolve(result);
        });
      });

      return promise;
    };

    var examineFolder = function(folder) {

      var promise = new Promise((resolve, reject) => {

        var fInfo = fs.statSync(folder);
        var result = {
          type: 'folder',
          noOfFiles: 0,
          size: 0,
          subitems: [],
          last_accessed: fInfo.atime,
          last_modified: fInfo.mtime,
          created: fInfo.birthtime
        };

        fs.readdir(folder, (err, files) => {

          if (err) {
            reject(err);
          }

          var received = 0;
          var count = files.length;

          for (var i = 0; i < count; ++i) {

            var file = files[i];

            if ((file === '.') || (file === '..')) {
              received += 1;
              continue;
            }

            var f = path.join(folder, files[i]);

            checkItem(f).then((item) => {

              received += 1;

              result.subitems.push(item);
              result.size += item.size;
              result.noOfFiles += item.noOfFiles;

              if (received == count) {
                result.display_size = calcUnitSize(result.size);
                resolve(result);
              }
            });
          }
        });
      });

      return promise;
    };

    var checkItem = function(item) {

      var fInfo = fs.statSync(item);

      if (fInfo.isDirectory()) {
        return examineFolder(item);
      } else {
        return examineFile(item);
      }
    };

    return {

      examine: function(uploadRequest) {

        var promise = new Promise((resolve, reject) => {

          var received = 0;
          var count = uploadRequest.length;

          for (var n = 0; n < count; ++n) {

            var request = uploadRequest[n];

            checkItem(request.path).then((info) => {

              received += 1;

              $q.when(true).then(() => {
                request.info = info;
                request.status = 'ready';
              });

              if (received == count) {
                resolve(uploadRequest);
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

  module.exports = FileSystemService;

})();

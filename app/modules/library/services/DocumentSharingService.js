(function() {

  'use strict';

  function DocumentSharingService() {

    var remote = require('remote');
    var app = remote.require('app');

    var fs = require('fs');
    var path = require('path');
    var asar = require('asar');
    var rm = require('rimraf');

    var _import = function(targetFolder) {

      var promise = new Promise((resolve, reject) => {

        fs.readdir(targetFolder, (err, files) => {

          if (err) {
            reject(err);
            return;
          }

          var results = [];
          var archives = 0;

          files.forEach((file) => {

            if (path.extname(file) === '.archive') {

              archives += 1;

              var asarFile = path.join(targetFolder, file);
              var tempPath = path.join(app.getPath('temp'), path.basename(file));

              asar.extractAll(asarFile, tempPath);

              var doc = JSON.parse(fs.readFileSync(path.join(tempPath, 'metadata.json')));
              var atts = JSON.parse(fs.readFileSync(path.join(tempPath, 'attachments.json')));

              doc._attachments = {};

              for (var attName in atts) {

                var attachment = atts[attName];

                attachment.content = fs.readFileSync(path.join(tempPath, 'attachments', attName));
                doc._attachments[attName] = {
                  content_type: attachment.content_type,
                  data: attachment.content
                };
              }

              rm(tempPath, () => {

                results.push(doc);

                if (results.length === archives) {
                  resolve(results);
                }
              });
            }
          });
        });
      });

      return promise;
    };

    var _export = function(documents, targetFolder) {

      var promise = new Promise((resolve, reject) => {

        var tempPath = app.getPath('temp');

        var results = [];

        documents.forEach((doc) => {

          var name = doc.id || doc._id;

          var capturePath = path.join(tempPath, name.substr(0, name.lastIndexOf('.')));
          var attachmentPath = path.join(capturePath, 'attachments');

          if (!fs.existsSync(capturePath)) fs.mkdirSync(capturePath);
          if (!fs.existsSync(attachmentPath)) fs.mkdirSync(attachmentPath);

          for (var attName in doc._attachments) {
            var attachment = doc._attachments[attName];

            fs.writeFileSync(path.join(attachmentPath, attName), attachment.data);
            delete attachment.data;
          }

          fs.writeFileSync(path.join(capturePath, 'attachments.json'), JSON.stringify(doc._attachments));

          delete doc._attachments;
          delete doc._rev;

          fs.writeFileSync(path.join(capturePath, 'metadata.json'), JSON.stringify(doc));

          var asarFile = path.join(targetFolder, name + '.archive');
          asar.createPackage(capturePath, asarFile, function(err) {

            if (err) {
              reject(err);
            }

            rm(capturePath, () => {
              results.push({
                doc: doc,
                target: asarFile
              });

              if (results.length === documents.length) {
                resolve(results);
              }
            });
          });
        });
      });

      return promise;

    };

    var _replicate = function(to) {
      console.log(to);
    };

    return {
      import: _import,
      export: _export,
      replicate: _replicate
    };
  }

  module.exports = DocumentSharingService;

})();

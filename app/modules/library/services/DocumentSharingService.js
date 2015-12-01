(function() {

  'use strict';

  function DocumentSharingService(LibraryDataService) {

    var remote = require('remote');
    var app = remote.require('app');
    var dialog = remote.require('dialog');

    var fs = require('fs');
    var path = require('path');

    var asar = require('asar');
    var rm = require('rimraf');

    var _requestTemporaryFile = function(id, attachment) {

      var fileName = path.join(app.getPath('temp'), `${id}.mhtml`);
      fs.writeFileSync(fileName, attachment.data);
      return fileName;
    };

    var _requestFiles = function() {

      var files = dialog.showOpenDialog(app.getMainWindow(), {
        title: 'Please select files:',
        defaultPath: app.getPath('home'),
        properties: ['openFile', 'multiSelections']
      });

      return files;
    };

    var _requestFolder = function() {

      var targetPath = dialog.showOpenDialog(app.getMainWindow(), {
        title: 'Please select destination folder:',
        defaultPath: app.getPath('home'),
        properties: ['openDirectory', 'createDirectory']
      });

      return targetPath[0];
    };

    var _import = function(files) {

      var promise = new Promise((resolve, reject) => {

        var results = [];
        var archives = 0;

        files.forEach((file) => {

          if (path.extname(file) === '.archive') {

            archives += 1;

            var tempPath = path.join(app.getPath('temp'), path.basename(file));

            asar.extractAll(file, tempPath);

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

      return promise;
    };

    var _export = function(documents, targetFolder) {

      var promise = new Promise((resolve, reject) => {

        var tempPath = app.getPath('temp');

        var results = [];

        documents.forEach((doc) => {

          LibraryDataService.item(doc._id).then((result) => {

            var name = result.meta.name || doc._id;

            var capturePath = path.join(tempPath, name);
            var attachmentPath = path.join(capturePath, 'attachments');

            if (!fs.existsSync(capturePath)) fs.mkdirSync(capturePath);
            if (!fs.existsSync(attachmentPath)) fs.mkdirSync(attachmentPath);

            for (var attName in result._attachments) {
              var attachment = result._attachments[attName];

              fs.writeFileSync(path.join(attachmentPath, attName), attachment.data);
              delete attachment.data;
            }

            fs.writeFileSync(path.join(capturePath, 'attachments.json'), JSON.stringify(result._attachments));

            delete result._attachments;
            delete result._rev;

            fs.writeFileSync(path.join(capturePath, 'metadata.json'), JSON.stringify(result));

            var asarFile = path.join(targetFolder, name + '.archive');
            asar.createPackage(capturePath, asarFile, function(err) {

              if (err) {
                reject(err);
              }

              rm(capturePath, () => {
                results.push({
                  doc: result,
                  target: asarFile
                });

                if (results.length === documents.length) {
                  resolve(results);
                }
              });
            });
          }).catch((err) => {
            reject(err);
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
      replicate: _replicate,
      requestFiles: _requestFiles,
      requestFolder: _requestFolder,
      requestTemporaryFile: _requestTemporaryFile
    };
  }

  module.exports = DocumentSharingService;

})();

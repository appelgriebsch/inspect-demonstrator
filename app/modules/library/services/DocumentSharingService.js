(function() {

  'use strict';

  function DocumentSharingService() {

    var remote = require('remote');
    var app = remote.require('app');

    var fs = require('fs');
    var path = require('path');
    var asar = require('asar');
    var rm = require('rimraf');

    var _import = function(file) {
      console.log(file);
    };

    var _export = function(document, targetFolder) {

      var promise = new Promise((resolve, reject) => {

        var tempPath = app.getPath('temp');
        var name = document.id;

        var capturePath = path.join(tempPath, name.substr(0, name.lastIndexOf('.')));
        var attachmentPath = path.join(capturePath, 'attachments');

        if (!fs.existsSync(capturePath)) fs.mkdirSync(capturePath);
        if (!fs.existsSync(attachmentPath)) fs.mkdirSync(attachmentPath);

        for (var attName in document._attachments) {
          var attachment = document._attachments[attName];

          fs.writeFileSync(path.join(attachmentPath, attName), attachment.data);
          delete attachment.data;
        }

        fs.writeFileSync(path.join(capturePath, 'attachments.json'), JSON.stringify(document._attachments));
        delete document._attachments;
        fs.writeFileSync(path.join(capturePath, 'metadata.json'), JSON.stringify(document));

        var asarFile = path.join(targetFolder, name + '.archive');
        asar.createPackage(capturePath, asarFile, function(err) {

          if (err) {
            reject(err);
          }

          rm(capturePath, () => {
            resolve({
              target: asarFile
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

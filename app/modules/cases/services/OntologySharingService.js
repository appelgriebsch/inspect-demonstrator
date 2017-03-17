(function() {

  'use strict';

  function OntologySharingService(OntologyDataService) {

    const electron = require('electron');
    const app = electron.remote.app;
    const dialog = electron.remote.dialog;

    const fs = require('fs');
    const path = require('path');

    var _requestTemporaryFile = function(id, attachment) {

      var fileName = path.join(app.getPath('temp'), `${id}.mhtml`);
      fs.writeFileSync(fileName, attachment.data);
      return fileName;
    };

    var _requestFile = function(func, filter) {

      var filters = [];

      if (filter) {
        filters.push(filter);
      } else {
        filters.push({
          name: 'Ontology File',
          extensions: ['ttl']
        });
      }

      return func(app.getMainWindow(), {
        title: 'Please select files:',
        defaultPath: app.getPath('home'),
        filters: filters,
        properties: ['openFile']
      });
    };


    var _import = function(path) {
      return new Promise((resolve, reject) => {
        OntologyDataService.clear().then(() => {
          return OntologyDataService.import(path);
        }).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      });
    };

    var _export = function(path) {
      return OntologyDataService.export(path);

    };



    return {
      import: _import,
      export: _export,
      requestSaveFile: (filter) => {
        return _requestFile(dialog.showSaveDialog, filter);
      },
      requestOpenFile: (filter) => {
        return _requestFile(dialog.showOpenDialog, filter);
      },
      requestTemporaryFile: _requestTemporaryFile
    };
  }

  module.exports = OntologySharingService;

})();

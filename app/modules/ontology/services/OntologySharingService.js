(function() {

  'use strict';

  function OntologySharingService(OntologyDataService) {

    const electron = require('electron');
    const app = electron.remote.app;
    const dialog = electron.remote.dialog;

    const fs = require('fs');
    const path = require('path');

    const _requestTemporaryFile = (id, attachment) => {

      const fileName = path.join(app.getPath('temp'), `${id}.mhtml`);
      fs.writeFileSync(fileName, attachment.data);
      return fileName;
    };

    const _requestFile = (func, filter) => {

      const filters = [];

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


    const _import = (path)  => {
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

    const _export = (path) => {
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

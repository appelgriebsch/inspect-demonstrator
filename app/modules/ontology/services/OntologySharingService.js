(function () {
  'use strict';

  function OntologySharingService (OntologyDataService, OntologyMetadataService) {
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

    const _import = (ontologyPath) => {
      const metaDataPath = ontologyPath.replace('.ttl', '.meta');
      return new Promise((resolve, reject) => {
        OntologyDataService.clear().then(() => {
          return OntologyDataService.import(ontologyPath);
        }).then(() => {
          if (fs.existsSync(metaDataPath)) {
            return OntologyMetadataService.import(metaDataPath);
          } else {
            return true;
          }
        }).then(resolve)
          .catch(reject);
      });
    };
    const _export = (ontologyPath) => {
      return new Promise((resolve, reject) => {
        const metaDataPath = ontologyPath.replace('.ttl', '.meta');
        Promise.all([
          OntologyDataService.export(ontologyPath),
          OntologyMetadataService.export(metaDataPath)
        ]).then(resolve)
          .catch(reject);
      });
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

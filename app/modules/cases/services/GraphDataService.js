(function() {

  'use strict';

  function GraphDataService(PouchDBService) {

    let db;

    const _saveOptions = (options) => {

      return Promise.resolve(
        db.get(options._id)
          .then(function(result) {

            if ((result.version === undefined) || (result.version !== options.version)) {
              options._rev = result._rev;
              return db.put(options);
            }
            return true;
          })
          .catch(function(err) {

            if (err.status == 404) {
              return db.put(options);
            } else {
              throw err;
            }
          })
      );
    };

    return {

      initialize: () => {
        // just examples for now
        const templates = {
          _id: '_design/templates',
          version: '1.0',
          graphOptions: {
            nodeSize: 12,
            nodeColor: 'green'
          },
          caseOptions: {
            _id: '',
            nodeSize: 12,
            nodeColor: 'green'
          }
        };
        this.templates = templates;

        return PouchDBService.initialize('graph').then((pouchdb) => {

          db = pouchdb;

          return Promise.all([
            _saveOptions(templates),
          ]);
        });
      },

      loadOptions: (id)  => {
        return db.get(id);
      },
      newCaseOptions: () => {
        var doc = this.templates.caseOptions || {};
        return JSON.parse(JSON.stringify(doc));
      },
      newGraphOptions: () => {
        var doc = this.templates.graphOptions || {};
        return JSON.parse(JSON.stringify(doc));
      },
      save: (options) => {
        if (!options._id) {
          return Promise.reject(new Error('Document needs an _id'));
        }
        return _saveOptions(options);
      },
      deleteOptions: (options) => {
        return db.remove(options);
      }
    };
  }

  module.exports = GraphDataService;

})();

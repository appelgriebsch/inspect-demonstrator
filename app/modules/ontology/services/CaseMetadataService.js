(function () {
  'use strict';

  function CaseMetadataService (PouchDBService) {
    let db;
    const app = require('electron').remote.app;

    const _saveCaseMetadata = (data) => {
      return Promise.resolve(
        db.get(data._id)
          .then((result) => {
            if ((result.createdBy !== data.createdBy) || (result.createdOn !== data.createdOn)) {
              throw Error("Can't save case metadata, created by and created on must not change.");
            }
            if (result.lastEditedOn !== data.lastEditedOn) {
              data._rev = result._rev;
              return db.put(data);
            }
            return true;
          })
          .catch((err) => {
            if (err.status === 404) {
              return db.put(data);
            } else {
              throw err;
            }
          })
      );
    };

    const _saveDoc = function(doc) {
      return Promise.resolve(
        db.get(doc._id)
          .then(function(result) {

            if ((result.version === undefined) || (result.version !== doc.version)) {
              doc._rev = result._rev;
              return db.put(doc);
            }
            return true;
          })
          .catch(function(err) {

            if (err.status === 404) {
              return db.put(doc);
            } else {
              throw err;
            }
          })
      );
    };

    const _initialize = () => {
      if (db) {
        return Promise.resolve();
      }
      return Promise.resolve(
        PouchDBService.initialize('cases').then((pouchdb) => {
          db = pouchdb;
        })
      );
    };

    return {
      initialize: () => {
        return _initialize();
      },
      createCaseMetadata: (id, user, date) => {
        return {
          _id: `${id}_metadata`,
          createdBy: user,
          createdOn: date,
          lastEditedBy: user,
          lastEditedOn: date,
          status: 'open',
          investigator: '',
        };
      },
      retrieveCaseMetadata: function(caseIdentifier) {
        return db.get(`${caseIdentifier}_metadata`);
      },
      saveCaseMetadata: function(data) {
        return _saveCaseMetadata(data);
      },
    };
  }
  module.exports = CaseMetadataService;
})();

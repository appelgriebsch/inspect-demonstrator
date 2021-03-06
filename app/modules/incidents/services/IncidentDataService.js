(function() {

  'use strict';

  function IncidentDataService(PouchDBService) {

    var db;    

    var saveDoc = function(doc) {

      var promise = Promise.resolve(
        db.get(doc._id)
        .then(function(result) {

          if ((result.version === undefined) || (result.version !== doc.version)) {
            doc._rev = result._rev;
            return db.put(doc);
          }
          return true;
        })
        .catch(function(err) {

          if (err.status == 404) {
            return db.put(doc);
          } else {
            throw err;
          }
        })
      );

      return promise;
    };

    return {

      initialize: function() {

        var ddoc = {
          _id: '_design/incidents',
          version: '0.1.0',
          views: {
            all: {
              map: function mapFun(doc) {
                emit(doc.createdAt);
              }.toString()
            }
          }
        };

        return PouchDBService.initialize('incidents').then((pouchdb) => {

          db = pouchdb;
          return saveDoc(ddoc);
        });
      },

      incidents: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('incidents/all', options);
      },

      get: function(docID) {
        return db.get(docID);
      },

      save: function(doc) {
        return saveDoc(doc);
      },

      delete: function(doc) {
        return db.remove(doc);
      }
    };
  }

  module.exports = IncidentDataService;

})();

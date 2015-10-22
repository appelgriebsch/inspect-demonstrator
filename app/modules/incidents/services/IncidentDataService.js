(function() {

  'use strict';

  function IncidentDataService(PouchDBService) {

    var db = PouchDBService.initialize('incidents');

    var saveDoc = function(doc) {

      var promise = Promise.resolve(
        db.get(doc._id)
        .then(function(result) {

          if (result) {
            doc._rev = result._rev;
          }
          return db.put(doc);
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
          views: {
            all: {
              map: function mapFun(doc) {
                emit(doc.createdAt);
              }.toString()
            }
          }
        };

        return saveDoc(ddoc);
      },

      incidents: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('incidents/all', options);
      }
    };
  }

  module.exports = IncidentDataService;

})();

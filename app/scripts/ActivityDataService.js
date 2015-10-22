(function() {

  'use strict';

  function ActivityDataService(PouchDBService) {

    var db = PouchDBService.initialize('activities');

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
          _id: '_design/audits',
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

      events: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('audits/all', options);
      },

      search: function(filter) {

        var options = {
          descending: true
        };

        return db.allDocs(options);
      },

      writeEntry: function(doc) {

        return db.post(doc);
      }
    };
  }

  module.exports = ActivityDataService;

})();

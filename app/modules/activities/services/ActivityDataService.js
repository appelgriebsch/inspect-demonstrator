(function() {

  'use strict';

  function ActivityDataService(PouchDBService) {

    var db = PouchDBService.initialize('activities');

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

        db.get('_design/audits')
          .then(function(result) {
            if (result) {
              ddoc._rev = result._rev;
            }
            return db.put(ddoc);
          })
          .catch(function(err) {
            if (err.status == 404) {
              // view did not exists, save to create new one
              return db.put(ddoc);
            } else {
              throw err;
            }
          });
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

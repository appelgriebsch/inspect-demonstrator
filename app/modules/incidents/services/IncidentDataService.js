(function() {

  'use strict';

  function IncidentDataService(PouchDBService) {

    var db = PouchDBService.initialize('incidents');

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

        db.get('_design/incidents')
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

(function() {

  'use strict';

  function LibraryDataService(PouchDBService) {

    var db = PouchDBService.initialize('library');

    return {

      initialize: function() {

        var ddoc = {
          _id: '_design/books',
          views: {
            all: {
              map: function mapFun(doc) {
                emit(doc.createdAt);
              }.toString()
            }
          }
        };

        db.get('_design/books')
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

      books: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('books/all', options);
      }
    };
  }

  module.exports = LibraryDataService;

})();

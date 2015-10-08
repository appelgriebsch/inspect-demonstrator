(function() {

  'use strict';

  function LibraryDataService(PouchDBService) {

    var db = PouchDBService.initialize('library');

    var initializeDBView = function(view) {

      var promise = Promise.resolve(
      db.get(view._id)
        .then(function(result) {

          if (result) {
            view._rev = result._rev;
          }
          return db.put(view);
        })
        .catch(function(err) {

          if (err.status == 404) {
            return db.put(view);
          }
          else {
            throw err;
          }
        })
      );

      return promise;
    };

    return {

      initialize: function() {

        var documents = {
          _id: '_design/docs',
          views: {
            all: {
              map: function mapFun(doc) {
                if (doc.type === 'document') {
                  emit(doc.createdAt);
                }
              }.toString()
            },
            byTag: {
              map: function mapFun(doc) {
                if (doc.type === 'document') {
                  doc.tags.forEach(function(elem) {
                    emit(elem);
                  });
                }
              }.toString()
            },
            byAuthor: {
              map: function mapFun(doc) {
                if (doc.type === 'document') {
                  emit(doc.author);
                }
              }.toString()
            }
          }
        };
        var websites = {
          _id: '_design/web',
          views: {
            all: {
              map: function mapFun(doc) {
                if (doc.type === 'website') {
                  emit(doc.createdAt);
                }
              }.toString()
            },
            byTag: {
              map: function mapFun(doc) {
                if (doc.type === 'website') {
                  doc.tags.forEach(function(elem) {
                    emit(elem);
                  });
                }
              }.toString()
            },
            byAuthor: {
              map: function mapFun(doc) {
                if (doc.type === 'website') {
                  emit(doc.author);
                }
              }.toString()
            }
          }
        };
        var library = {
          _id: '_design/lib',
          views: {
            all: {
              map: function mapFun(doc) {
                emit(doc.createdAt);
              }.toString()
            }
          }
        };

        var p1 = initializeDBView(library);
        var p2 = initializeDBView(websites);
        var p3 = initializeDBView(documents);

        return Promise.all([p1, p2, p3]);
      },

      library: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('lib/all', options);
      },

      item: function(docID) {
        return db.get(docID, { attachments: true, binary: true });
      },

      save: function(doc) {

      },

      delete: function(doc) {
        return db.remove(doc);
      }
    };
  }

  module.exports = LibraryDataService;

})();

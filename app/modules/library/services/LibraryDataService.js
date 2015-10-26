(function() {

  'use strict';

  function LibraryDataService(PouchDBService) {

    var db = PouchDBService.initialize('library');

    var buildSearchIndex = function() {

      return db.search({
        fields: ['title', 'description', 'author', 'subject', 'tags'],
        build: true
      });
    };

    var saveDoc = function(doc) {

      var promise = Promise.resolve(
      db.get(doc._id)
        .then(function(result) {

          if ((result) && (result.version !== doc.version)) {
            doc._rev = result._rev;
            return db.put(doc);
          }
          return true;
        })
        .catch(function(err) {

          if (err.status == 404) {
            return db.put(doc);
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
          version: '0.1.0',
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
          version: '0.1.0',
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
          version: '0.1.0',
          views: {
            all: {
              map: function mapFun(doc) {
                emit(doc.createdAt);
              }.toString()
            }
          }
        };

        var p1 = saveDoc(library);
        var p2 = saveDoc(websites);
        var p3 = saveDoc(documents);
        var p4 = buildSearchIndex();

        return Promise.all([p1, p2, p3, p4]);
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
        return saveDoc(doc);
      },

      delete: function(doc) {
        return db.remove(doc);
      },

      search: function(query) {

        return db.search({
          query: query,
          fields: ['title', 'description', 'author', 'subject', 'tags'],
          include_docs: true
        });
      }
    };
  }

  module.exports = LibraryDataService;

})();

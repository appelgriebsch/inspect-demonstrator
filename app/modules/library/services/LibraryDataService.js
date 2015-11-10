(function() {

  'use strict';

  function LibraryDataService(PouchDBService) {

    var db = PouchDBService.initialize('library');

    var buildSearchIndex = function() {

      return db.search({
        fields: ['title', 'description', 'author', 'custom_tags', 'tags'],
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
          } else {
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
          version: '1.0',
          views: {
            all: {
              map: function mapFun(doc) {
                if ((doc.meta) && (doc.meta['@type'] !== 'WebSite')) {
                  emit(doc.createdAt);
                }
              }.toString()
            },
            byTag: {
              map: function mapFun(doc) {
                if ((doc.meta) && (doc.meta['@type'] !== 'WebSite')) {
                  doc.meta.keywords.split(',').forEach(function(elem) {
                    emit(elem);
                  });
                }
              }.toString()
            },
            byAuthor: {
              map: function mapFun(doc) {
                if ((doc.meta) && (doc.meta['@type'] !== 'WebSite')) {
                  emit(doc.meta.author);
                }
              }.toString()
            }
          }
        };
        var websites = {
          _id: '_design/web',
          version: '1.0',
          views: {
            all: {
              map: function mapFun(doc) {
                if ((doc.meta) && (doc.meta['@type'] === 'WebSite')) {
                  emit(doc.createdAt);
                }
              }.toString()
            },
            byTag: {
              map: function mapFun(doc) {
                if ((doc.meta) && (doc.meta['@type'] === 'WebSite')) {
                  doc.meta.keywords.split(',').forEach(function(elem) {
                    emit(elem);
                  });
                }
              }.toString()
            },
            byAuthor: {
              map: function mapFun(doc) {
                if ((doc.meta['@type']) && (doc.meta['@type'] === 'WebSite')) {
                  emit(doc.meta.author);
                }
              }.toString()
            }
          }
        };
        var library = {
          _id: '_design/lib',
          version: '1.0',
          views: {
            all: {
              map: function mapFun(doc) {
                if (doc.meta) {
                  emit(doc.createdAt);
                }
              }.toString()
            }
          }
        };
        var templates = {
          _id: '_design/templates',
          version: '1.0',
          book: {
            '@context': 'http://schema.org',
            '@type': 'Book',
            about: '${subject}',                      // subject
            alternativeHeadline: '${headline2}',
            author: '${author}',
            bookEdition: '${bookEdition}',
            bookFormat: '${bookFormat}',
            datePublished: '${publishDate}',
            description: '${description}',
            fileFormat: '${mimeType}',                 // mime type
            headline: '${headline}',                   // title
            isbn: '${isbn}',
            keywords: '${tags}',                       // separated by comma
            name: '${name}',
            numberOfPages: '${noOfPages}',
            publisher: '${publisher}',
            thumbnailUrl: {
              '@context': 'http://schema.org',
              '@type': 'ImageObject',
              caption: '${caption}',
              contentUrl: '${thumbnailUrl}',                // could be embedded base64 encoded
              encodingFormat: '${thumbnailFormat}'          // mime type
            },
            url: '${url}'                                   // origin of book
          },
          article: {
            '@context': 'http://schema.org',
            '@type': 'Article',
            about: '${subject}',                      // subject
            alternativeHeadline: '${headline2}',
            author: '${author}',
            datePublished: '${publishDate}',
            description: '${description}',
            fileFormat: '${mimeType}',                 // mime type
            headline: '${headline}',                   // title
            keywords: '${tags}',                       // separated by comma
            name: '${name}',
            publisher: '${publisher}',
            thumbnailUrl: {
              '@context': 'http://schema.org',
              '@type': 'ImageObject',
              caption: '${caption}',
              contentUrl: '${thumbnailUrl}',                // could be embedded base64 encoded
              encodingFormat: '${thumbnailFormat}'          // mime type
            },
            url: '${url}'                                   // origin of book
          },
          website: {
            '@context': 'http://schema.org',
            '@type': 'WebSite',
            about: '${subject}',                      // subject
            alternativeHeadline: '${headline2}',
            author: '${author}',
            datePublished: '${publishDate}',
            description: '${description}',
            fileFormat: '${mimeType}',                 // mime type
            headline: '${headline}',                   // title
            keywords: '${tags}',                       // separated by comma
            name: '${name}',
            thumbnailUrl: {
              '@context': 'http://schema.org',
              '@type': 'ImageObject',
              caption: '${caption}',
              contentUrl: '${thumbnailUrl}',                // could be embedded base64 encoded
              encodingFormat: '${thumbnailFormat}'          // mime type
            },
            url: '${url}'                                   // origin of book
          },
          person: {
            '@context': 'http://schema.org',
            '@type': 'Person',
            email: '${email}',
            familyName: '${familyName}',
            givenName: '${givenName}',
            honorificPrefix: '${honorPrefix}',          // Dr./Mrs./Mr.
            honorificSuffix: '${honorSuffix}',          // M.D./PhD/MSCSW
            jobTitle: '${jobTitle}'
          },
          organization: {
            '@context': 'http://schema.org',
            '@type': 'Organization',
            email: '${email}',
            legalName: '${legalName}',
            logo: {
              '@context': 'http://schema.org',
              '@type': 'ImageObject',
              caption: '${caption}',
              contentUrl: '${thumbnailUrl}',                // could be embedded base64 encoded
              encodingFormat: '${thumbnailFormat}'          // mime type
            }
          }
        };

        return Promise.all([
          saveDoc(templates),
          saveDoc(library),
          saveDoc(websites),
          saveDoc(documents),
          buildSearchIndex()
        ]);
      },

      library: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('lib/all', options);
      },

      item: function(docID) {
        return db.get(docID, {
          attachments: true,
          binary: true
        });
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

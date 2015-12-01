(function() {

  'use strict';

  function LibraryDataService(PouchDBService) {

    var db = PouchDBService.initialize('library');
    var uuid = require('uuid');

    var buildSearchIndex = function() {

      return db.search({
        fields: ['meta.name', 'meta.description', 'meta.author.name', 'meta.about', 'meta.keywords'],
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

        var library = {
          _id: '_design/library',
          version: '1.0',
          views: {
            all: {
              map: function mapFun(doc) {
                if (doc.meta) {
                  emit(doc.createdAt);
                }
              }.toString()
            }
          },
          byTag: {
            map: function mapFun(doc) {
              if (doc.meta) {
                doc.meta.keywords.split(',').forEach(function(elem) {
                  emit(elem);
                });
              }
            }.toString()
          },
          byAuthor: {
            map: function mapFun(doc) {
              if (doc.meta) {
                emit(doc.meta.author);
              }
            }.toString()
          },
          byType: {
            map: function mapFun(doc) {
              if (doc.meta) {
                emit(doc.meta['@type']);
              }
            }.toString()
          },
          byPublishDate: {
            map: function mapFun(doc) {
              if (doc.meta) {
                emit(doc.meta.datePublished);
              }
            }.toString()
          },
          byStatus: {
            map: function mapFun(doc) {
              emit(doc.status);
            }.toString()
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
            author: '${author}',                      // person or organization
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
            publisher: '${publisher}',                // person or organization
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
            author: '${author}',                      // person or organization
            datePublished: '${publishDate}',
            description: '${description}',
            fileFormat: '${mimeType}',                 // mime type
            headline: '${headline}',                   // title
            keywords: '${tags}',                       // separated by comma
            name: '${name}',
            publisher: '${publisher}',                 // person or organization
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
            author: '${author}',                      // person or organization
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
            additionalName: '${additionalName}',        // middle name
            description: '${description}',
            email: '${email}',
            familyName: '${familyName}',
            givenName: '${givenName}',
            honorificPrefix: '${honorPrefix}',          // Dr./Mrs./Mr.
            honorificSuffix: '${honorSuffix}',          // M.D./PhD/MSCSW
            jobTitle: '${jobTitle}',
            name: '${name}'
          },
          organization: {
            '@context': 'http://schema.org',
            '@type': 'Organization',
            description: '${description}',
            email: '${email}',
            legalName: '${legalName}',
            logo: {
              '@context': 'http://schema.org',
              '@type': 'ImageObject',
              caption: '${caption}',
              contentUrl: '${thumbnailUrl}',                // could be embedded base64 encoded
              encodingFormat: '${thumbnailFormat}'          // mime type
            },
            name: '${name}'
          },
          bookFormats: [
            'Paperback',
            'Hardcover',
            'EBook'
          ]
        };

        this.templates = templates;

        return Promise.all([
          saveDoc(templates),
          saveDoc(library),
          buildSearchIndex()
        ]);
      },

      library: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('library/all', options);
      },

      item: function(docID) {
        return db.get(docID, {
          attachments: true,
          binary: true
        });
      },

      save: function(doc) {

        if (!doc._id) {
          doc._id = uuid.v4();
        }

        return saveDoc(doc);
      },

      delete: function(doc) {
        return db.remove(doc);
      },

      search: function(query) {

        return db.search({
          query: query,
          fields: ['meta.name', 'meta.description', 'meta.author.name', 'meta.about', 'meta.keywords'],
          include_docs: true
        });
      },

      createMetadataFromTemplate: function(template) {
        var doc = this.templates[template] || {};
        return JSON.parse(JSON.stringify(doc));
      },

      buildAuthorInformation: function(info) {
        var template = this.templates['person'];
        var author = info.split(/\s*,\s*/);
        if (author.length > 1) {
          template.familyName = author[0];
          template.givenName = author[1];
          template.name = `${author[1]} ${author[0]}`;
        } else {
          author = info.split(' ');
          template.name = info;
          if (author.length > 0) {
            template.familyName = author[1];
            template.givenName = author[0];
          }
          else {
            delete template.familyName;
            delete template.givenName;
          }
        }
        return template;
      }
    };
  }

  module.exports = LibraryDataService;

})();

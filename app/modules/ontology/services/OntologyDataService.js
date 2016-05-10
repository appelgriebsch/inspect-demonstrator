(function() {

  'use strict';

  function OntologyDataService(LevelGraphDBService) {

    var db;
    var path = require('path');
    var fs = require('fs');

    var _importTTL = function(doc) {

      var promise = new Promise((resolve, reject) => {

        var stream = fs.createReadStream(doc)
                       .pipe(db.n3.putStream());

        stream.on('finish', function() {
          resolve(db);
        });

        stream.on('error', function(err) {
          reject(err);
        });
      });

      return promise;
    };

    return {

      initialize: function() {

        db = LevelGraphDBService.initialize('ontology');

        return Promise.all([
          _importTTL(path.join(__dirname, 'ontologie.ttl'))
        ]);
      },

      node: function(uri) {

        var promise = new Promise((resolve, reject) => {
          db.get({ subject: uri }, function(err, nodes) {
            if (err) {
              reject(err);
            } else {
              resolve(nodes);
            }
          });
        });

        return promise;
      },

      save: function(doc) {

      },

      delete: function(doc) {

      },

      search: function(query) {

      }
    };
  }

  module.exports = OntologyDataService;

})();

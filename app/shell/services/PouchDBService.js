(function() {

  'use strict';

  function PouchDBService() {

    // initialize pouch db adapter
    var PouchDB = require('pouchdb');
    PouchDB.plugin(require('pouchdb-find'));
    PouchDB.plugin(require('pouchdb-quick-search'));

    var app = require('electron').remote.app;

    var sysCfg = app.sysConfig();
    var settings = { adapter: 'leveldb', prefix: sysCfg.paths.data };

    function DataService(dbName) {

      var promise = new Promise((resolve, reject) => {
        var result = PouchDB(dbName, settings);
        resolve(result);
      });

      return promise;
    }

    return {

      initialize: function(dbName) {
        return new DataService(dbName);
      }
    };
  }

  module.exports = PouchDBService;

})();

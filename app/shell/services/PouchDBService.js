(function() {

  'use strict';

  function PouchDBService() {

    // initialize pouch db adapter
    var PouchDB = require('pouchdb');
    PouchDB.plugin(require('geopouch'));
    PouchDB.plugin(require('pouchdb-find'));
    PouchDB.plugin(require('pouchdb-quick-search'));
    PouchDB.plugin(require('transform-pouch'));
    PouchDB.plugin(require('pouchdb-auth'));

    var remote = require('remote');
    var app = remote.require('app');

    var sysCfg = app.sysConfig();
    var settings = { prefix: sysCfg.paths.data };

    function DataService(dbName) {

      var _db;

      try {
        settings.adapter = 'leveldb';
        _db = new PouchDB(dbName, settings);
      } catch (err) {
        console.log('leveldb-adapter is not working, fallback to SQLite (websql)');
        require('pouchdb/extras/websql');
        settings.adapter = 'websql';
        _db = new PouchDB(dbName, settings);
      }

      return {

        instance: function() {
          return _db;
        }
      };
    }

    return {

      initialize: function(dbName) {
        return new DataService(dbName).instance();
      }
    };
  }

  module.exports = PouchDBService;

})();

(function() {

  'use strict';

  angular.module('inspectApp').service('LogService', ['PouchDBService', LogService]);

  function LogService(PouchDBService) {

    var db = PouchDBService.initialize('audits');
    var remote = require('remote');
    var app = remote.require('app');
    var sysCfg = app.sysConfig();

    var _prefill = function(event) {

      var doc = angular.copy(event);
      var today = new Date();

      doc.createdAt = today.toISOString();
      doc.createdBy = sysCfg.user;
      doc.createdOn = sysCfg.host;

      return doc;
    };

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

      addInfo: function(entry) {

        var doc = _prefill(entry);
        doc.class = 'info';

        return db.post(doc);
      },

      addWarning: function(entry) {

        var doc = _prefill(entry);
        doc.class = 'warning';

        return db.post(doc);
      },

      addError: function(entry) {

        var doc = _prefill(entry);
        doc.class = 'error';

        return db.post(doc);
      },

      search: function(filter) {

        var options = {
          descending: true
        };

        return db.allDocs(options);
      }
    };
  }

})();

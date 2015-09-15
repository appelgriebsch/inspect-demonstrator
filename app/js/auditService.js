(function() {

  'use strict';

  angular.module('inspectApp').service('AuditService', [AuditService]);

  function AuditService() {

    var self = this;
    var remote = require('remote');
    var app = remote.require('app');
    var db = app.pouchDB('audits');

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

        db.get('_design/audits').then(function(result) {
          if (result) {
            ddoc._rev = result._rev;
          }
          return db.put(ddoc);
        });
      },

      events: function() {

        var options = {
          descending: true,
          include_docs: true
        };

        return db.query('audits/all', options);
      },

      addEvent: function(entry) {

        var doc = angular.copy(entry);
        var today = new Date();

        doc.createdAt = today.toISOString();
        doc.createdBy = app.username();
        doc.createdOn = app.hostname();

        return db.post(doc);
      },

      search: function(filter) {

        var options = {
          descending: true
        };

        return db.allDocs(options);
      }
    };
  };

})();

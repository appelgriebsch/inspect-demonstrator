/*jshint esversion: 6 */
(function(angular) {

  'use strict';

  function CasesDataService(PouchDBService) {
    var app = require('electron').remote.app;
    var sysCfg = app.sysConfig();

    var Case = require('../models/Case');
    var db;

    var _saveDoc = (doc) => {

      var promise = Promise.resolve(
        db.get(doc._id)
          .then(function(result) {
            if ((result.version === undefined) || (result.version !== doc.version)) {
              doc._rev = result._rev;
              return db.put(doc);
            }
            return true;
          })
          .catch(function(err) {

            if (err.status === 404) {
              return db.put(doc);
            } else {
              throw err;
            }
          })
      );

      return promise;
    };

    var _setEditedParams = (caseEdited) => {
      caseEdited.lastEditedBy = sysCfg.user;
      caseEdited.lastEditedDate = new Date().toISOString();
    };

    var _saveCase = (caseEdited) => {
      var promise = Promise.resolve(
        db.get(caseEdited._id)
          .then(function(caseDb) {
            if (angular.equals(caseEdited, caseDb)) {
              return true;
            }
            caseEdited._rev = caseDb._rev;
            _setEditedParams(caseEdited);
            return db.validatingPut(caseEdited);
          })
          .catch(function(err) {
            if (err.status === 404) {
              _setEditedParams(caseEdited);
              caseEdited.status = "open";
              return db.validatingPut(caseEdited);
            } else {
              throw err;
            }
          })
      );
      return promise;
    };

    var _caseValidationFunction = function(newDoc, oldDoc, context) {
      var _require = function(property) {
        if (!newDoc[property]) {
          throw({forbidden : 'Document has no property: '+property+'!'});
        }
      };
      var _immutable = function(property) {
        if (oldDoc && oldDoc[property] !== newDoc[property]) {
          throw({forbidden : 'Document property: '+property+' may not be changed!'});
        }
      };
      var _mutable = function(property) {
        if (oldDoc && oldDoc[property] === newDoc[property]) {
          throw({forbidden: 'Document property: ' + property + ' may not be the same in both versions!'});
        }
      };
      if (newDoc["@type"] && (newDoc["@type"] === "case")) {
        if (oldDoc && oldDoc.status === "closed") {
          throw({forbidden: 'Closed cases may not be edited!'});
        }
        _immutable("@type");
        _require("_id");
        _require("name");
        _require("creator");
        _immutable("creator");
        _require("creationDate");
        _immutable("creationDate");
        _require("status");
        _require("lastEditedBy");
        _require("lastEditedDate");
        _require("instances");
        _mutable("lastEditedDate");
      }
    };
    return {

      initialize: function() {
        var caseDesign = {
          _id: '_design/cases',
          version: '1.6',
          validate_doc_update: _caseValidationFunction.toString(),
          views: {
            all: {
              map: function mapFun(doc) {
                emit(doc.creationDate);
              }.toString()
            },
            byCreator: {
              map: function mapFun(doc) {
                if ((doc['@type']) && ((doc['@type']) === "case")) {
                  emit(doc.creator);
                }
              }.toString()
            },
            byStatus: {
              map: function mapFun(doc) {
                if ((doc['@type']) && ((doc['@type']) === "case")) {
                  emit(doc.status);
                }
              }.toString()
            },
          },
          case: {
            _id: undefined,
            name: undefined,
            creationDate: new Date().toISOString(),
            lastEditedDate: undefined,
            "@type": "case",
            creator: undefined,
            lastEditedBy: undefined,
            status: "new",
            instances: []
          }
        };

        this.design = caseDesign;

        return PouchDBService.initialize('cases').then((pouchdb) => {

          db = pouchdb;

          return Promise.all([
            _saveDoc(caseDesign),
          ]);
        });
      },

      case: function(caseID) {
        return db.get(caseID, {
          attachments: false,
          binary: false
        });
      },
      allCases: function() {
        return db.get(caseID, {
          attachments: false,
          binary: false
        });
      },

      save: function(caseFile) {
        console.log("save", caseFile);
        if (caseFile) {
          return _saveCase(caseFile);
        }

      },
      newCase: function () {
        var doc = this.design["case"] || {};
        doc.creator = sysCfg.user;

        return JSON.parse(JSON.stringify(doc));
      },
      fetchByCreator: function(creator) {
        var options = {
          descending: true,
          include_docs: true,
          key: creator
        };
        return db.query(
          'cases/byCreator',
          options);
      },
      // XXX: just for development
      deleteCase: function(doc) {
        return db.remove(doc);
      }
    };
  }
  module.exports = CasesDataService;

})(global.angular);

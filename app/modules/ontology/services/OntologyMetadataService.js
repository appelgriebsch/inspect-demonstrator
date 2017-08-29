(function () {
  'use strict';

  function OntologyMetadataService (PouchDBService) {
    const fs = require('fs');

    let db;

    const _saveMetadata = (data) => {
      return Promise.resolve(
        db.get(data._id)
          .then((result) => {
            if ((result.createdBy !== data.createdBy) || (result.createdOn !== data.createdOn)) {
              throw Error("Can't save case metadata, created by and created on must not change.");
            }
            if (result.lastEditedOn !== data.lastEditedOn) {
              data._rev = result._rev;
              return db.put(data);
            }
            return true;
          })
          .catch((err) => {
            if (err.status === 404) {
              return db.put(data);
            } else {
              throw err;
            }
          })
      );
    };

    const _saveNodeMetadata = (data) => {
      return Promise.resolve(
        db.get(data._id)
          .then((result) => {
             data._rev = result._rev;
             return db.put(data);
          })
          .catch((err) => {
            if (err.status === 404) {
              return db.put(data);
            } else {
              throw err;
            }
          })
      );
    };

    const _saveProfile = (profile, overwrite = true) => {
      if (!profile._id) {
        profile._id = `profile_${profile.name}`;
      }
      return Promise.resolve(
        db.get(profile._id)
          .then((result) => {
            if ((result.version === undefined) || (result.version !== profile.version)) {
              profile._rev = result._rev;
              if (overwrite === true) {
                return db.put(profile);
              }
            }
            return true;
          })
          .catch((err) =>{
            if (err.status === 404) {
              return db.put(profile);
            } else {
              throw err;
            }
          })
      );
    };

    const _saveDoc = function(doc) {
      return Promise.resolve(
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
    };

    const _newProfile = (profileName) => {
      const profile = this.templates.profile || {};
      profile.name = profileName;
      return JSON.parse(JSON.stringify(profile));
    };
    const _initialize = () => {
      if (db) {
        return Promise.resolve();
      }

      const profiles = {
        _id: '_design/data',
        version: '1.3',
        views: {
          profiles_by_name: {
            map: function (doc) {
              if ((doc) && (doc.type === 'profile')) {
                emit(doc.name);
              }
            }.toString()
          },
          active_profiles: {
            map: function (doc) {
              if ((doc) && (doc.type === 'profile') && (doc.active === true)) {
                emit(doc.name);
              }
            }.toString()
          }
        },

      };

      const templates = {
        _id: '_design/templates',
        version: '2.0',
        metadata: {
          'type': 'metadata',
          'createdBy': '',
          'createdOn': '',
          'lastEditedBy': '',
          'lastEditedOn': '',
          'status': 'open',
          'investigator': '',
        },
        profile: {
          'name': '${name}',
          'type': 'profile',
          'graphOptions': {},
          cases: {
            caseClassIri: '',
            caseNamePropertyIri: '',
            caseIndividualPropertyIri: '',
            individualCasePropertyIri: '',
          },
          symbols: {
            'http://www.AMSL/GDK/ontologie#Akteur': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf2ba',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Mensch': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf2be',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Organisation': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf19c',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Ereignis': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf0e7',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Fluss': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf021',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Ressource': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf085',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Schwachstelle': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf071',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Straftatbestand': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf0e3',
                size: 60
              }
            },
            'http://www.AMSL/GDK/ontologie#Uebertragungsweg': {
              shape: 'icon',
              icon: {
                face: 'FontAwesome',
                code: '\uf0ec',
                size: 60
              }
            },
          }
        }
      };
      this.templates = templates;

      const defaultProfile = _newProfile('default');

      return PouchDBService.initialize('cases').then((pouchdb) => {

        db = pouchdb;

        return Promise.all([
          _saveDoc(templates),
          _saveDoc(profiles),
          _saveProfile(defaultProfile, false)
        ]);
      });
    };

    return {
      initialize: () => {
        return _initialize();
      },
      newMetadata: (id, user, date) => {
        const metadata = this.templates.metadata || {};
        metadata._id = `metadata_${id}`;
        metadata.createdBy = user;
        metadata.createdOn = date;
        metadata.lastEditedBy = user;
        metadata.lastEditedOn = date;
        metadata.documentLinks = {};
        return JSON.parse(JSON.stringify(metadata));
      },
      metadata: (caseIdentifier) => {
        return db.get(`metadata_${caseIdentifier}`);
      },
      saveMetadata: function(data) {
        return _saveMetadata(data);
      },

      newNodeMetadata: (id, documents) => {
        return {
          _id : `node_${id}`,
          documents: Array.isArray(documents) ? documents : []
        };
      },
      nodeMetadata: (id) => {
        return Promise.resolve(
          db.get(`node_${id}`).then((data) => {
            return data;
        }).catch((err) => {
            if (err.status === 404) {
              return;
            } else {
              throw err;
            }
          })
        );
      },
      saveNodeMetadata: function(data) {
        return _saveNodeMetadata(data);
      },

      allProfileNames: () => {
        return db.query('data/profiles_by_name');
      },
      profile: (profileName) => {
        return db.get(`profile_${profileName}`, {attachments: true});
      },
      newProfile: (profileName) => {
        return _newProfile(profileName);
      },
      saveProfile: (profile) => {
        return _saveProfile(profile);
      },

      newGraphOptions: () => {
        var doc = this.templates.graphOptions || {};
        return JSON.parse(JSON.stringify(doc));
      },

      import: (path) => {
        return new Promise((resolve, reject) => {
          const stream = fs.createReadStream(path);
          db.load(stream)
            .then(resolve)
            .catch(reject);
        });
      },

      export: (path) => {
        return new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(path);
          db.dump(stream)
            .then(resolve)
            .catch(reject);
        });
      },

    };
  }
  module.exports = OntologyMetadataService;
})();

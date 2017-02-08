(function() {

  'use strict';

  function GraphDataService(PouchDBService) {

    let db;

    const _saveOptions = (options) => {

      return Promise.resolve(
        db.get(options._id)
          .then(function(result) {

            if ((result.version === undefined) || (result.version !== options.version)) {
              options._rev = result._rev;
              return db.put(options);
            }
            return true;
          })
          .catch(function(err) {

            if (err.status == 404) {
              return db.put(options);
            } else {
              throw err;
            }
          })
      );
    };

    return {

      initialize: () => {
        // just examples for now
        const templates = {
          _id: '_design/templates',
          version: '1.0',
          graphOptions: {
            height: '100%',
            width: '100%',
            autoResize: true,
            nodes: {
              shape: 'dot',
              scaling: {
                min: 10,
                max: 30,
                label: {
                  min: 10,
                  max: 30,
                  drawThreshold: 9,
                  maxVisible: 15
                }
              },
              font: {
                size: 12,
                face: 'Helvetica Neue, Helvetica, Arial'
              }
            },
            edges: {
              arrows: 'to',
              color: '#000000',
              width: 1,
              font: {
                size: 12,
                face: 'Helvetica Neue, Helvetica, Arial'
              },
              smooth: {
                enabled: true,
                type: "dynamic",
                roundness: 1
              }
            },
            groups: {
              instanceNode: {
                size : 12,
                color: {
                border: '#ff0000',
                background: '#ffffff',
                hover: {
                  border: '#ff0000',
                  background: '#ffffff'
                }
              },
                shape: 'box',
              },
              dataNode: {
                size: 12,
                shape: 'box',
                color: {
                border: '#000000',
                background: '#ffffff',
                hover: {
                  border: '#ff0000',
                  background: '#ffffff'
                }
              }
        }
      },
      physics: {
        barnesHut: {
          gravitationalConstant: -13250,
          centralGravity: 0.75,
          springLength: 135,
          damping: 0.28,
          avoidOverlap: 1,
          maxVelocity: 100
        },
        minVelocity: 0.75
      },
      interaction: {
        hover: true,
        hoverConnectedEdges: false,
        selectConnectedEdges: true
      }
    },
    caseOptions: {
      _id: '',
      nodeSize: 12,
      nodeColor: 'green'
    },
    autoSetupOptions: {
      instanzKnoten : true,
      attributsKnoten: true,
      kanten: true
    }
  };
        this.templates = templates;

        return PouchDBService.initialize('graph').then((pouchdb) => {

          db = pouchdb;

          return Promise.all([
            _saveOptions(templates),
          ]);
        });
      },

      loadOptions: (id)  => {
        return db.get(id);
      },
      newCaseOptions: () => {
        var doc = this.templates.caseOptions || {};
        return JSON.parse(JSON.stringify(doc));
      },
      newGraphOptions: () => {
        var doc = this.templates.graphOptions || {};
        return JSON.parse(JSON.stringify(doc));
      },
      newAutoSetupOptions: () => {
        var doc = this.templates.autoSetupOptions || {};
        return JSON.parse(JSON.stringify(doc));
      },
      save: (options) => {
        if (!options._id) {
          return Promise.reject(new Error('Document needs an _id'));
        }
        return _saveOptions(options);
      },
      deleteOptions: (options) => {
        return db.remove(options);
      }
    };
  }

  module.exports = GraphDataService;

})();

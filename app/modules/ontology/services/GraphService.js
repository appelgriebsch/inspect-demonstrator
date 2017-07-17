(function () {
  'use strict';

  function GraphService (OntologyDataService, CaseOntologyDataService) {
    const path = require('path');
    const OwlIndividual = require(path.join(__dirname, '../models/OwlIndividual'));
    const OwlClass = require(path.join(__dirname, '../models/OwlClass'));

    const _nodeTypes = {
      CLASS_NODE: 'CLASS_NODE',
      DATA_NODE: 'DATA_NODE',
      INDIVIDUAL_NODE: 'INDIVIDUAL_NODE'
    };

    const _edgeTypes = {
      INSTANCE_OF_EDGE: 'INSTANCE_OF_EDGE',
      SUBCLASS_OF_EDGE: 'SUBCLASS_OF_EDGE',

      INSTANCE_TO_DATA_EDGE: 'INSTANCE_TO_DATA_EDGE',
      INSTANCE_TO_INSTANCE_EDGE: 'INSTANCE_TO_INSTANCE_EDGE'
    };

    const _tags = {
      NO_CASE: '$NO_CASE$'
    };
    const _iconFontFace = 'FontAwesome';
    const _typeIcons = {
      'http://www.AMSL/GDK/ontologie#Akteur': '\uf2ba',
      'http://www.AMSL/GDK/ontologie#Mensch': '\uf2be',
      'http://www.AMSL/GDK/ontologie#Organisation': '\uf19c',
      'http://www.AMSL/GDK/ontologie#Ereignis': '\uf0e7',
      'http://www.AMSL/GDK/ontologie#Fluss': '\uf021',
      'http://www.AMSL/GDK/ontologie#Ressource': '\uf085',
      'http://www.AMSL/GDK/ontologie#Schwachstelle': '\uf071',
      'http://www.AMSL/GDK/ontologie#Straftatbestand': '\uf0e3',
      'http://www.AMSL/GDK/ontologie#Uebertragungsweg': '\uf0ec'
    };

    const _createDatatypeNodes = (individual) => {
      return individual.datatypeProperties.map((prop) => {
        return {
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          title: prop.target,
          label: prop.target,
          type: _nodeTypes.DATA_NODE,
          group: _nodeTypes.DATA_NODE,
          cases: individual.cases
        };
      });
    };

    const _iconFor = (iris) => {
      const iri = iris.find((iri) => {
        return _typeIcons[iri];
      });
      if (iri) {
        return {
          face: _iconFontFace,
          code: _typeIcons[iri],
          size: 60
        };
      }
    };

    const _createIndividualNode = (individual) => {
      const node = {
        id: individual.iri,
        label: individual.label,
        classes: individual.classIris,
        title: individual.label,
        type: _nodeTypes.INDIVIDUAL_NODE,
        group: (individual.cases.length === 0) ? _tags.NO_CASE : individual.cases[0],
        cases: (individual.cases.length === 0) ? [_tags.NO_CASE] : individual.cases,
      };
      const icon = _iconFor([individual.iri].concat(individual.classIris).concat(individual.allParentClassIris));
      if (icon) {
        node.shape = 'icon';
        node.icon = icon;
      }
      return node;
    };

    const _createClassNode = (clazz) => {
      const node = {
        id: clazz.iri,
        label: clazz.label,
        title: clazz.label,
        type: _nodeTypes.CLASS_NODE,
        group: _nodeTypes.CLASS_NODE,
        tags: [_nodeTypes.CLASS_NODE]
      };
      const icon = _iconFor([clazz.iri].concat(clazz.allParentClassIris));
      if (icon) {
        node.shape = 'icon';
        node.icon = icon;
      }
      return node;
    };

    const _createDatatypeEdges = (individual) => {
      return individual.datatypeProperties.map((prop) => {
        return {
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          from: individual.iri,
          to: `${individual.iri}_${prop.iri}_${prop.target}`,
          title: prop.label,
          type: _edgeTypes.INSTANCE_TO_DATA_EDGE
        };
      });
    };

    const _createInstanceOfEdge = (instanceIri, clazzIri) => {
      return {
        id: `${instanceIri}_instance_of_${clazzIri}`,
        from: instanceIri,
        to: clazzIri,
        title: 'type of',
        group: _edgeTypes.INSTANCE_OF_EDGE,
        dashes: true
      };
    };
    const _createSubClassOfEdge = (parentClassIri, childClassIri) => {
      return {
        id: `${parentClassIri}_subclass_of_${childClassIri}`,
        from: childClassIri,
        to: parentClassIri,
        title: 'subclass of',
        group: _edgeTypes.SUBCLASS_OF_EDGE,
        dashes: true
      };
    };
    const _createObjectEdge = (sourceIri, propertyIri, propertyLabel, targetIri) => {
      return {
        id: `${sourceIri}_${propertyIri}_${targetIri}`,
        from: sourceIri,
        to: targetIri,
        title: propertyLabel,
        type: _edgeTypes.INSTANCE_TO_INSTANCE_EDGE
      };
    };

    const _createNodeFilters = () => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.loadCaseList().then((cases) => {
          const filters = [];
          filters.push({
            id: _nodeTypes.CLASS_NODE,
            name: 'Schema Information',
            showOnOff: false,
            type: 'type'
          });
          filters.push({
            id: _nodeTypes.DATA_NODE,
            name: "Data Nodes",
            showOnOff: false,
            type: 'type'
          });

          filters.push({
            id:  _tags.NO_CASE,
            name: "Nodes without case",
            showOnOff: true,
            type: 'case'
          });
          cases.sort((c1, c2) => { return c1.name.localeCompare(c2.name);} );
          cases.forEach((c) => {
            filters.push({
              id: c.identifier,
              name: c.name,
              showOnOff: true,
              type: 'case'
            });
          });
          resolve(filters);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _searchTerms = () => {
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.fetchAllIndividualIris(),
          OntologyDataService.fetchAllClassIris()
        ]).then((result) => {
          const iris = [];
          result[0].forEach((iri) => {
            iris.push({id: iri, label: iri.replace(OntologyDataService.ontologyIri(), '')});
          });
          result[1].forEach((iri) => {
            iris.push({id: iri, label: iri.replace(OntologyDataService.ontologyIri(), '')});
          });
          resolve(iris);
        }).catch((err) => {
          reject(err);
        });
      });
    };

    const _initialize = () => {
      return Promise.resolve();

    };
    const _fetchNodesForCase = (id) => {
      return new Promise((resolve, reject) => {
        console.log("!!!!!!!!!!!!!!!!!!!!");
        CaseOntologyDataService.loadCase(id, true).then((result) => {
          console.log(result);
          resolve({nodes: [], edges: []});
        }).catch(reject);
      });
    };
  /*  const _fetchNodesForCase = (id) => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.loadCase(id, true).then((result) => {
          const promises = [];
          result.individuals.forEach((individual) => {
            promises.push(Promise.all([
              Promise.resolve(individual),
              CaseOntologyDataService.getCaseIdentifiersFor(individual.iri)
            ]));
          });
          return Promise.all(promises);
        }).then((result) => {
          let nodes = [];
          let edges = [];
          result.forEach((r) => {
            const individual = r[0];
            const caseIdentifiers = r[1];
            nodes.push(_createIndividualNode(individual, caseIdentifiers));

            individual.objectProperties.forEach((prop) => {
              edges.push(_createObjectEdge(individual.iri, prop.iri, prop.label, prop.target));
            });
            nodes = nodes.concat(_createDatatypeNodes(individual, caseIdentifiers));
            edges = edges.concat(_createDatatypeEdges(individual));
          });
          resolve({nodes: nodes, edges: edges});
        }).catch(reject);
      });
    };*/

    const _individualsToNodes = (individuals) => {
      return _convertEntities(individuals);
    };

    const _convertEntities = (entities) => {
      let nodes = [];
      let edges = [];
      if (entities && Array.isArray(entities)) {
        entities.forEach((e) => {
          let n;
          if (e instanceof OwlClass) {
            n = _convertClass(e);
          }
          if (e instanceof OwlIndividual) {
            n = _convertIndividual(e);
          }
          if (n) {
            nodes = nodes.concat(n.nodes);
            edges = edges.concat(n.edges);
          }
        });
      }
      return { nodes: nodes, edges: edges};
    };

    const _convertClass = (clazz) => {
      let nodes = [];
      let edges = [];

      // create nodes
      nodes.push(_createClassNode(clazz));

      // create edges
      clazz.parentClassIris.forEach((iri) => {
        edges.push(_createSubClassOfEdge(iri, clazz.iri));
      });
      clazz.childClassIris.forEach((iri) => {
        edges.push(_createSubClassOfEdge(clazz.iri, iri));
      });
      clazz.objectProperties.forEach((prop) => {
        edges.push(_createObjectEdge(prop.source, prop.iri, prop.label, prop.target));
      });
      clazz.individualIris.forEach((iri) => {
        edges.push(_createInstanceOfEdge(iri, clazz.iri));
      });
      return { nodes: nodes, edges: edges};
    };

    const _convertIndividual = (individual) => {
      let nodes = [];
      let edges = [];

      // create nodes
      nodes.push(_createIndividualNode(individual, []));
      nodes = nodes.concat(_createDatatypeNodes(individual, []));

      // create edges
      individual.objectProperties.forEach((prop) => {
        edges.push(_createObjectEdge(individual.iri, prop.iri, prop.label, prop.target));
      });
      individual.reverseObjectProperties.forEach((prop) => {
        edges.push(_createObjectEdge(prop.target, prop.iri, prop.label, individual.iri));
      });
      individual.classIris.forEach((iri) => {
        edges.push(_createInstanceOfEdge(individual.iri, iri));
      });
      edges = edges.concat(_createDatatypeEdges(individual));
      return { nodes: nodes, edges: edges};
    };

    const _filterNodes = (nodes, filters) => {
      //console.log("called _filterNodes nodes=",nodes, " filters=",filters);
      return nodes.filter((n) => {
        // if there is a type filter for that node and it is not enabled, exclude it
        const typeFilter = filters.find((f) => {
          return ((f.type === 'type') && (f.id === n.type));
        });
        if (typeFilter && (typeFilter.enabled !== true)) {
          return false;
        }

        // if there are case filters for that node and none enabled, exclude it
        if (n.cases){
          const enabled = filters.filter((f) => {
            return ((f.type === 'case') && (n.cases.indexOf(f.id) > -1));
          }).reduce((accumulator, f) => {
            return accumulator || f.enabled;
          }, false);
          if (enabled !== true) {
            return false;
          }
        }
        // else, include it
        return true;
      });
    };
    const _filterEdges = (edges, nodeIds) => {
      // just include edges belonging to nodes part of the result set
      return edges.filter((e) => {
        return ((nodeIds.indexOf(e.from) > -1) && (nodeIds.indexOf(e.to) > -1));
      });
    };

    const _filterUnique = (entities) => {
      const ids = [];
      return entities.reduce((accumulator, item) => {
        if (ids.indexOf(item.id) < 0) {
          ids.push(item.id);
          accumulator.push(item);
        }
        return accumulator;
      }, []);
    };
    const _nodes = (nodeIds, graphNodeIds = [], filters = [], filterEdges = true) => {
      if (!nodeIds || !Array.isArray(nodeIds)) {
        return Promise.reject('Node Ids must be of type array!');
      }
      // make node ids unique
      nodeIds = nodeIds.reduce((accumulator, item) => {
        if (accumulator.indexOf(item) < 0) {
          accumulator.push(item);
        }
        return accumulator;
      }, []);

      return new Promise((resolve, reject) => {
        CaseOntologyDataService.loadEntites(nodeIds)
          .then(_convertEntities)
          .then((result) => {
            let nodes = _filterNodes(result.nodes, filters);
            let edges = _filterUnique(result.edges);

            if (filterEdges === true) {
              const nodeIds = nodes.map((n) => {
                return n.id;
              }).concat(graphNodeIds);
              edges = _filterEdges(edges, nodeIds);
            }
            resolve({nodes: nodes, edges: edges});
          }).catch(reject);
      });
    };
    const _bfs = (nodeIds, depth = 0, filters = [], graphNodeIds = []) => {
      return _bfs2_(nodeIds, depth, filters, graphNodeIds);
    };

    /**
     * depth first search
     * @param queue - node ids to visit
     * @param depth - current depth
     * @param filters - node filters
     * @param graphNodeIds - initially, nodes which are already in the graph, after the first step, nodes from the result set are added
     * @param visited - nodes which were already visited (to avoid circles and so on)
     * @param nodes - the nodes result set
     * @param edges - the edges result set
     * @returns {*}
     * @private
     */
    const _bfs2_ = (queue, depth = 0, filters = [], graphNodeIds = [], visited = [], nodes = [], edges= []) => {
      // console.log("called _bfs2_ with queue=", queue, " depth=", depth, " visited=", visited, " filters=", filters, " graphNodeIds=", graphNodeIds, " nodes=", nodes, " edges=", edges);
      if ((depth < 0) || (queue.length === 0)) {
        return Promise.resolve({nodes: nodes, edges: edges});
      }
      return new Promise((resolve, reject) => {
        _nodes(queue, [], filters, false).then((result) => {
          // if depth = 0, data nodes should not be added to the result set
          // as they would be depth 1
          if (depth === 0) {
            nodes = nodes.concat(result.nodes.filter((n) => {
              return n.type !== _nodeTypes.DATA_NODE;
            }));
          } else {
            nodes = nodes.concat(result.nodes);
          }
          // add the nodes from the result to the set of nodes
          // in the graph to know which edges should be added
          graphNodeIds = graphNodeIds.concat(nodes.filter((n) => {
            return graphNodeIds.indexOf(n.id) < 0;
          }).map((n) => {
            return n.id;
          }));
          // add the nodes from the result to the visited set
          // so they are not visited twice
          visited = visited.concat(nodes.filter((n) => {
            return visited.indexOf(n.id) < 0;
          }).map((n) => {
            return n.id;
          }));
          queue = [];
          // add all node ids to the queue which were never visited and
          // which are connected to a node which was visited through an edge
          result.edges.forEach((e) => {
            // no datatype nodes should be queued
            if (e.type !==_edgeTypes.INSTANCE_TO_DATA_EDGE) {
              // don't queue if both, source and target, were either visited or not visited
              const visitedFrom = visited.indexOf(e.from);
              const visitedTo = visited.indexOf(e.to);
              if ((visitedFrom > -1) && (visitedTo < 0) && (queue.indexOf(e.to) < 0)) {
                queue.push(e.to);
              }
              if ((visitedTo > -1) && (visitedFrom < 0) && (queue.indexOf(e.from) < 0)) {
                queue.push(e.from);
              }
            }
          });
          edges = edges.concat(result.edges.filter((e) => {
            // don't add if source and target node are not in the graph
            return ((graphNodeIds.indexOf(e.from) > -1) && (graphNodeIds.indexOf(e.to) > -1));
          }));
          resolve(_bfs2_(queue, depth - 1, filters, graphNodeIds, visited, nodes, edges));
        }).catch(reject);
      });
    };

    return {
      initialize: () => {
        return _initialize();
      },
      individualsToNodes: (individuals) => {
        return _individualsToNodes(individuals);
      },
      nodes: (nodeIds, graphNodeIds, filters) => {
        return _nodes(nodeIds, graphNodeIds, filters);
      },
      neighbors: (node, filters, depth, graphNodeIds) => {
        return _bfs([node.id], depth, filters, graphNodeIds);
      },
      createFilters: () => {
        return _createNodeFilters();
      },
      searchTerms: () => {
        return _searchTerms();
      },
      caseNodes: (caseId) => {
        return _fetchNodesForCase(caseId);
      },
      tags: _tags,
      nodeTypes: _nodeTypes
    };
  }
  module.exports = GraphService;
})();

(function () {
  'use strict';

  function GraphService (OntologyDataService, CaseOntologyDataService) {
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

    const _createDatatypeNodes = (individual,caseIdentifiers) => {
      return individual.datatypeProperties.map((prop) => {
        return {
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          title: prop.target,
          label: prop.target,
          type: _nodeTypes.DATA_NODE,
          group: _nodeTypes.DATA_NODE,
          cases: caseIdentifiers
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

    const _createIndividualNode = (individual, caseIdentifiers) => {
      const node = {
        id: individual.iri,
        label: individual.label,
        classes: individual.classIris,
        title: individual.label,
        type: _nodeTypes.INDIVIDUAL_NODE,
        group: (caseIdentifiers.length === 0) ? _tags.NO_CASE : caseIdentifiers[0],
        cases: caseIdentifiers
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

    const _createInstanceOfEdge = (instance, clazzIri) => {
      return {
        id: `${instance.iri}_instance_of_${clazzIri}`,
        from: instance.iri,
        to: clazzIri,
        title: 'type of',
        group: _nodeTypes.CLASS_NODE,
        dashes: true
      };
    };
    const _createSubClassOfEdge = (parentClassIri, childClassIri) => {
      return {
        id: `${parentClassIri}_subclass_of_${childClassIri}`,
        from: childClassIri,
        to: parentClassIri,
        title: 'subclass of',
        group: _nodeTypes.CLASS_NODE,
        dashes: true
      };
    };

    const _createObjectEdges = (individual) => {
      return individual.objectProperties.map((prop) => {
        return {
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          from: individual.iri,
          to: prop.target,
          title: prop.label,
          type: _edgeTypes.INSTANCE_TO_INSTANCE_EDGE
        };
      });
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

    const _createItems = (objects, creationFunc) => {
      return objects.map((o) => {
        return creationFunc(o);
      });
    };

    const _createNodeFilters = () => {
      return new Promise((resolve, reject) => {
        CaseOntologyDataService.loadCaseList().then((cases) => {
          const filters = [];
          filters.push({
            id: _nodeTypes.CLASS_NODE,
            name: 'Schema Information',
            hasCheckBox: true,
            hasColor: true,
            type: 'schema'
          });
          filters.push({
            id:_nodeTypes.DATA_NODE,
            name: "Data Nodes",
            hasCheckBox: true,
            hasColor: true,
            type: 'data'
          });

          /* filters.push({
           id:  _tags.NO_CASE,
           name: "Nodes without case",
           hasCheckBox: false
           }); */
          cases.forEach((c) => {
            filters.push({
              id: c.identifier,
              name: c.name,
              hasCheckBox: true,
              hasColor: true,
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

    const _fetchClassNode = (iri, filters) => {
      // only fetch it if class nodes are to be displayed
      const filter = filters.find((f) => {
        return f.id === _nodeTypes.CLASS_NODE;
      });
      if (filter && filter.enabled === true) {
        return OntologyDataService.fetchClass(iri, { allParentClassIris: true })
          .then(_createClassNode);
      }
      return Promise.resolve();
    };

    const _fetchIndividualNode = (iri, filters) => {
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.fetchIndividual(iri, { allParentClassIris: true }),
          CaseOntologyDataService.getCaseIdentifiersFor(iri)
        ]).then((result) => {
          return _createIndividualNode(result[0], result[1]);
        })
          .then((node) => {
            let add = false;
            filters.forEach((f) => {
              if ((node.cases.indexOf(f.id) >= 0) && (f.enabled === true)) {
                add = true;
              }
            });
            if (add === true) {
              resolve(node);
            } else {
              resolve();
            }
          }).catch(reject);
      });
    };

    const _fetchNode = (nodeId, filters) => {
      if (!nodeId) {
        return Promise.reject(Error('Id must not be undefined.'));
      }
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.isClass(nodeId),
          OntologyDataService.isIndividual(nodeId)
        ]).then((result) => {
          if (result[0] === true) {
            return _fetchClassNode(nodeId, filters);
          }
          if (result[1] === true) {
            return _fetchIndividualNode(nodeId, filters);
          }
          reject(Error(`Iri: ${nodeId} identifies neither a class nor an individual.`));
        }).then(resolve)
          .catch(reject);
      });
    };

    const _fetchNodesForCase = (id) => {
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
          console.log(result);

          /*// create nodes
           // TODO: !!!!
           let nodes = _createItems(result[1], _createIndividualNode);
           nodes = [].concat.apply(nodes, _createItems(result[1], _createDatatypeNodes));

           // create edges
           let edges = [].concat.apply([], _createItems(result[1], _createObjectEdges));
           edges = [].concat.apply(edges, _createItems(result[1], _createDatatypeEdges));

           */
          resolve({nodes: nodes, edges: edges});
        });
      });
    };

    const _focusNodes = (nodeIds, filters) => {
      if (nodeIds === undefined || !Array.isArray(nodeIds)) {
        Promise.reject('Node Ids must be of type array!');
      }
      if (filters === undefined || !Array.isArray(filters)) {
        Promise.reject('Filters must be of type array!');
      }
      const promises = nodeIds.map((id) => {
        return _fetchNode(id, filters);
      });
      return new Promise((resolve, reject) => {
        Promise.all(promises).then((result) => {
          const filteredResult = result.reduce((accumulator, element) => {
            if (element) {
              accumulator.push(element);
            }
            return accumulator;
          }, []);
          resolve(filteredResult);
        }).catch(reject);
      });
    };

    const _neighborsForIndividual = (node, filters, graphNodeIds) => {
      if (!node) {
        return Promise.reject(Error('Node must not be undefined.'));
      }

      return new Promise((resolve, reject) => {
        const options = {
          objectProperties: true,
          reverseObjectProperties: true,
          datatypeProperties: true,
          allParentClassIris: true
        };
        /** result **/
        let nodes = [];
        let edges = [];

        /** result iris to find the complete set of edges **/
        const nodeIds = graphNodeIds.splice(0);

        let individual;
        OntologyDataService.fetchIndividual(node.id, options).then((result) => {
          individual = result;
          const promises = [];
          // fetch schema information
          const filter = filters.find((f) => {
            return f.id === _nodeTypes.CLASS_NODE;
          });
          if (filter && filter.enabled === true) {
            individual.classIris.forEach((iri) => {
              nodeIds.push(iri);
              promises.push(OntologyDataService.fetchClass(iri, {allParentClassIris: true}));
            });
          }
          return Promise.all(promises);
        }).then((classes) => {
          // add schema information to the result
          classes.forEach((clazz) => {
            nodes.push(_createClassNode(clazz));
          });
          const promises = [Promise.all([
            Promise.resolve(individual),
            CaseOntologyDataService.getCaseIdentifiersFor(individual.iri)
          ])];
          // fetch neighboring individuals (outgoing edges)
          individual.objectProperties.forEach((prop) => {
            if (nodeIds.indexOf(prop.target) < 0) {
              nodeIds.push(prop.target);
              promises.push(Promise.all([
                OntologyDataService.fetchIndividual(prop.target, options),
                CaseOntologyDataService.getCaseIdentifiersFor(prop.target)
              ]));
            }
          });
          // fetch neighboring individuals (incoming edges)
          individual.reverseObjectProperties.forEach((prop) => {
            if (nodeIds.indexOf(prop.target) < 0) {
              nodeIds.push(prop.target);
              promises.push(Promise.all([
                OntologyDataService.fetchIndividual(prop.target, options),
                CaseOntologyDataService.getCaseIdentifiersFor(prop.target)
              ]));
            }
          });
          return Promise.all(promises);
        }).then((result) => {
          result.forEach((r) => {
            const individual_ = r[0];
            const individualCases = r[1];
            const filter = filters.find((f) => {
              return ((individualCases.indexOf(f.id) > -1) && (f.enabled === true));
            });
            if (!CaseOntologyDataService.isCaseIndividual(individual_) && filter) {
              nodes.push(_createIndividualNode(individual_, individualCases));
              individual_.objectProperties.forEach((prop) => {
                if (nodeIds.indexOf(prop.target) > -1) {
                  edges.push(_createObjectEdge(individual_.iri, prop.iri, prop.label, prop.target));
                }
              });
              individual_.reverseObjectProperties.forEach((prop) => {
                if (nodeIds.indexOf(prop.target) > -1) {
                  //edges.push(_createObjectEdge(individual_.iri, prop.iri, prop.label, prop.target));
                  edges.push(_createObjectEdge(prop.target, prop.iri, prop.label, individual_.iri));
                }
              });
              individual_.classIris.forEach((iri) => {
                if (nodeIds.indexOf(iri) > -1) {
                  edges.push(_createInstanceOfEdge(individual_, iri));
                }
              });
            }
          });
          // add datatype nodes
          const dataNodeFilter = filters.find((f) => {
            return ((f.id === _nodeTypes.DATA_NODE) && (f.enabled === true));
          });
          if (dataNodeFilter) {
            nodes = nodes.concat(_createDatatypeNodes(result[0][0], result[0][1]));
            edges = edges.concat(_createDatatypeEdges(result[0][0]));
          }
          resolve({nodes: nodes, edges: edges});
        }).catch(reject);
      });
    };

    const _neighborsForClass = (node, filters, graphNodeIds) => {
      if (!node) {
        return Promise.reject(Error('Node must not be undefined.'));
      }
      // only fetch it if class nodes are to be displayed
      const filter = filters.find((f) => {
        return ((f.id === _nodeTypes.CLASS_NODE) && f.enabled);
      });
      if (!filter) {
        return Promise.resolve([]);
      }
      return new Promise((resolve, reject) => {
        const options = {
          subClasses: true,
          superClasses: true,
          individuals: true,
          objectProperties: true,
          allParentClassIris: true
        };
        /** result **/
        let nodes = [];
        let edges = [];

        /** result iris to find the complete set of edges **/
        const nodeIds = graphNodeIds.splice(0);

        let clazz;
        let objectProperties;
        OntologyDataService.fetchClass(node.id, options).then((result) => {
          clazz = result;
          // fetch ObjectProperties to get the connected classes
          const promises = clazz.objectPropertyIris.map((iri) => {
            return OntologyDataService.fetchObjectProperty(iri, {domain: true, range: true});
          });
          return Promise.all(promises);
        }).then((properties) => {
          objectProperties = properties;
          const promises = [];
          // fetch parentClasses
          clazz.parentClassIris.forEach((iri) => {
            if (nodeIds.indexOf(iri) < 0) {
              nodeIds.push(iri);
              promises.push(OntologyDataService.fetchClass(iri, options));
            }
          });
          // fetch child classes
          clazz.childClassIris.forEach((iri) => {
            if (nodeIds.indexOf(iri) < 0) {
              nodeIds.push(iri);
              promises.push(OntologyDataService.fetchClass(iri, options));
            }
          });
          // fetch classes connected to object properties
          properties.forEach((prop) => {
            prop.domainIris.forEach((iri) => {
              if (nodeIds.indexOf(iri) < 0) {
                nodeIds.push(iri);
                promises.push(OntologyDataService.fetchClass(iri, options));
              }
            });
            prop.rangeIris.forEach((iri) => {
              if (nodeIds.indexOf(iri) < 0) {
                nodeIds.push(iri);
                promises.push(OntologyDataService.fetchClass(iri, options));
              }
            });
          });
          return Promise.all(promises);
        }).then((classes) => {
          classes.forEach((c) => {
            nodes.push(_createClassNode(c));
          });
          // add parent edges
          clazz.parentClassIris.forEach((iri) => {
            edges.push(_createSubClassOfEdge(iri, clazz.iri));
          });
          // add child edges
          clazz.childClassIris.forEach((iri) => {
            edges.push(_createSubClassOfEdge(clazz.iri, iri));
          });
          // add objectproperty edges
          objectProperties.forEach((prop) => {
            prop.domainIris.forEach((domainIri) => {
              prop.rangeIris.forEach((rangeIri) => {
                const edge = _createObjectEdge(domainIri, prop.iri, prop.label, rangeIri);
                const tempEdge = edges.find((e) => {
                  return e.id === edge.id;
                });
                if (!tempEdge) {
                  edges.push(edge);
                }
              });
            });
          });
          // fetch individuals
          const promises = clazz.individualIris.map((iri) => {
            return Promise.all([
              OntologyDataService.fetchIndividual(iri, {allParentClassIris: true}),
              CaseOntologyDataService.getCaseIdentifiersFor(iri)
            ]);
          });
          return Promise.all(promises);
        }).then((result) => {
          result.forEach((r) => {
            const individual = r[0];
            const individualCases = r[1];
            const filter = filters.find((f) => {
              return ((individualCases.indexOf(f.id) > -1) && (f.enabled === true));
            });
            if (filter) {
              nodes.push(_createIndividualNode(individual, individualCases));
              edges.push(_createInstanceOfEdge(individual, clazz.iri));
            }
          });
          resolve({nodes: nodes, edges: edges});
        }).catch(reject);
      });
    };
    const findNeighbors = (node, filters = [], graphNodeIds = []) => {
      return new Promise((resolve, reject) => {
        Promise.all([
          OntologyDataService.isClass(node.id),
          OntologyDataService.isIndividual(node.id)
        ]).then((result) => {
          if (result[0] === true) {
            return _neighborsForClass(node, filters, graphNodeIds);
          }
          if (result[1] === true) {
            return _neighborsForIndividual(node, filters, graphNodeIds);
          }
          //if neither
          return Promise.resolve({nodes: [], edges: []});
        }).then(resolve)
          .catch(reject);
      });
    };

    const bfs = (node, depth = 1, filters = [], graphNodeIds = []) => {
      node.depth = 0;
     // return bfs_([node], [], depth, filters, graphNodeIds, [], []);
      return bfs2_([node], [], depth, filters, graphNodeIds, [], []);

    };

    const bfs2_ = (queue, visited, depth, filters = [], graphNodeIds = [], nodes, edges) => {
      //console.log("called bfs_concurrent with queue=", queue, " visited=", visited, " depth=", depth);
      nodes = nodes.slice(0);
      edges = edges.slice(0);
      visited = visited.slice(0);
      if ((queue.length === 0) || (depth < 1) || (queue[0].depth === depth)) {
        return Promise.resolve({nodes: nodes, edges: edges});
      }
      const d = queue[0].depth;
      const promises = [];
      queue.forEach((n) => {
        promises.push(findNeighbors(n, filters, graphNodeIds));
        visited.push(n);
      });
      queue = [];
      return new Promise((resolve, reject) => {
        Promise.all(promises).then((result) => {
          result.forEach((neighbors) => {
            neighbors.nodes.forEach((n) => {
              // if node isn't already queued and has not been visited yet, add to queue
              const foundInVisited = visited.find((item) => {
                return item.id === n.id;
              });
              const foundInQueue = queue.find((item) => {
                return item.id === n.id;
              });
              if (!foundInQueue && !foundInVisited) {
                n.depth = d + 1;
                queue.push(n);
              }
              const foundInNodes = nodes.find((item) => {
                return item.id === n.id;
              });
              if (!foundInNodes && !foundInVisited) {
                nodes.push(n);
              }
            });
            neighbors.edges.forEach((e) => {
              const foundInEdges = edges.find((item) => {
                return item.id === e.id;
              });
              if (!foundInEdges) {
                edges.push(e);
              }
            });
          });
          resolve(bfs2_(queue, visited, depth, filters, graphNodeIds, nodes, edges));
        }).catch(reject);
      });
    };
    const bfs_ = (queue, visited, depth, filters = [], graphNodeIds = [], nodes, edges) => {
      console.log("called bfs_ with queue=",queue," visited=",visited," depth=",depth);
      nodes = nodes.slice(0);
      edges = edges.slice(0);
      queue = queue.slice(0);
      visited = visited.slice(0);
      if ((queue.length === 0) || (depth < 1)) {
        return Promise.resolve({ nodes: nodes, edges: edges});
      }
      const currentNode = queue.shift();
      console.log("currentNode", currentNode);
      visited.push(currentNode);
      if (currentNode.depth === depth) {
        return Promise.resolve({ nodes: nodes, edges: edges});
      }
      return new Promise((resolve, reject) => {
        findNeighbors(currentNode, filters, graphNodeIds).then(function(neighbors) {
          neighbors.nodes.forEach((n) => {
            // if node isn't already queued and has not been visited yet, add to queue
            const foundInVisited = visited.find((item) => {
              return item.id === n.id;
            });
            const foundInQueue = queue.find((item) => {
              return item.id === n.id;
            });
            if (!foundInQueue && !foundInVisited) {
              n.depth = currentNode.depth + 1;
              queue.push(n);
            }
            const foundInNodes = nodes.find((item) => {
              return item.id === n.id;
            });
            if (!foundInNodes && !foundInVisited) {
              nodes.push(n);
            }
          });
          neighbors.edges.forEach((e)  => {
            const foundInEdges = edges.find((item) => {
              return item.id === e.id;
            });
            if (!foundInEdges) {
              edges.push(e);
            }
          });
          console.log("bfs_ neighbor nodes",  neighbors.nodes);
          resolve(bfs_(queue, visited, depth, filters, graphNodeIds, nodes, edges));
        }).catch(reject);
      });
    };



    return {
      initialize: () => {
        return _initialize();
      },
      focusNodes: (nodeIds, filters) => {
        return _focusNodes(nodeIds, filters);
      },
      neighbors: (node, filters, depth, graphNodeIds) => {
        return bfs(node, depth, filters, graphNodeIds);
        // return _neighbors([node], filters, depth, graphNodeIds);
      },
      createFilters: () => {
        return _createNodeFilters();
      },
      searchTerms: () => {
        return _searchTerms();
      },
      tags: () => {
        return _tags;
      },

      caseNodes: (id) => {
        return _fetchNodesForCase(id);
      },
      nodeTypes: _nodeTypes
    };
  }
  module.exports = GraphService;
})();

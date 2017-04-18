(function(vis) {
  'use strict';

  const TypeFilter = require('./filters/TypeFilter');
  const TagFilter = require('./filters/TagFilter');

  function GraphService(OntologyDataService, CaseOntologyDataService) {
    /** immutable after initialization **/
      // all nodes
    const _nodes = new vis.DataSet();
    // all edges
    const _edges = new vis.DataSet();
    let _cases = [];
    let _initialized = false;

    /** mutable after initialization **/
    let _hiddenNodeIdsStack = [];
    let _nodeFilters = [];
    let _edgeFilters = [];
    let _viewport = {
      nodes: new vis.DataSet(),
      edges: new vis.DataSet()
    };

    const _nodeTypes = {
      CLASS_NODE: 'CLASS_NODE',
      DATA_NODE: 'DATA_NODE',
      INDIVIDUAL_NODE: 'INDIVIDUAL_NODE',
    };

    const _edgeTypes = {
      INSTANCE_OF_EDGE: 'INSTANCE_OF_EDGE',
      SUBCLASS_OF_EDGE: 'SUBCLASS_OF_EDGE'
    };

    const _tags = {
      NO_CASE: 'NO_CASE',
      CONNECTED_TO_INDIVIDUAL: 'CONNECTED_TO_INDIVIDUAL',
    };
    const _focusNodes = (nodeIds) => {
      if (nodeIds === undefined || !Array.isArray(nodeIds)) {
        throw Error('Must be of type array!');
      }
      const result = {
        nodes: [],
        edges: []
      };

      // reset hidden nodes because the context changed
      _hiddenNodeIdsStack = [];

      _viewport.nodes.clear();
      _viewport.edges.clear();

      _viewport.nodes.add(_nodes.get(nodeIds));
      //TODO: filter?
      result.nodes = _viewport.nodes.get();

      return result;
    };

    const _hideNodes = (nodeIds) => {
      const result = {
        nodes: [],
        edges: []
      };
      // hide nodes
      result.nodes = _viewport.nodes
        .get(nodeIds, {
          fields: ['id'],
        }).map((node) => {
          node.hidden = true;
          return node;
        });
      _viewport.nodes.update(result.nodes);

      // hide connecting edges
      result.edges = _viewport.edges
        .get({
          fields: ['id', 'from', 'to'],
          filter: (edge) => {
            const fromNode = result.nodes.find((node) => {
              return node.id === edge.from;
            });
            const toNode = result.nodes.find((node) => {
              return node.id === edge.to;
            });
            return ((fromNode !== undefined) || (toNode !== undefined));
          }
        }).map((edge) => {
          edge.hidden = true;
          return edge;
        });
      _viewport.edges.update(result.edges);

      return result;
    };


    const _hide = (nodeIds) => {
      const result = _hideNodes(nodeIds);
      _hiddenNodeIdsStack.push(result.nodes.map((node) => {
        return node.id;
      }));
      result.stackSize = _hiddenNodeIdsStack.length;
      return result;
    };

    const _show = () => {
      const nodeIds = _hiddenNodeIdsStack.length > 0 ? _hiddenNodeIdsStack.pop() : [];
      const result = _showNodes(nodeIds);
      result.stackSize = _hiddenNodeIdsStack.length;
      return result;
    };

    const _showNodes = (nodeIds) => {
      const result = {
        nodes: [],
        edges: []
      };

      // show nodes
      result.nodes = _viewport.nodes
        .get(nodeIds, {
          filter: (node) => {
            return _applyItemFilters(node, _viewport.nodes, _viewport.edges, _nodeFilters);
          }
        }).map((node) => {
          node.hidden = false;
          return node;
        });
      _viewport.nodes.update(result.nodes);

      // show connecting edges
      result.edges = _viewport.edges
        .get({
          fields: ['id', 'from', 'to'],
          filter: (edge) => {
            const fromNode = _viewport.nodes.get(edge.from);
            const toNode = _viewport.nodes.get(edge.to);
            if ((fromNode === null) || (toNode === null)) {
              return false;
            }
            // TODO: add edges filter
            return ((fromNode.hidden !== true) && (toNode.hidden !== true));
          }
        }).map((edge) => {
          edge.hidden = false;
          return edge;
        });
      _viewport.edges.update(result.edges);
      return result;
    };
    const _createDatatypeNodes = (individual) => {
      const nodes = [];
      const caseLabels = _findCaseLabels(individual.objectProperties, "http://www.AMSL/GDK/ontologie#ist_Bestandteil_von")
        .concat(_findCaseLabels(individual.reverseObjectProperties, "http://www.AMSL/GDK/ontologie#beinhaltet"));
      const tags = (caseLabels.length === 0) ? [_nodeTypes.DATA_NODE, _tags.NO_CASE] : [_nodeTypes.DATA_NODE].concat(caseLabels);
      individual.datatypeProperties.forEach((prop) => {
        nodes.push({
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          // group: '',
          title: prop.target,
          label: prop.target,
          type: _nodeTypes.DATA_NODE,
          group: _nodeTypes.DATA_NODE,
          tags: tags
        });
      });
      return nodes;
    };
    const _createDatatypeEdges = (individual) => {
      const edges = [];
      individual.datatypeProperties.forEach((prop) => {
        edges.push({
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          from: individual.iri,
          to: `${individual.iri}_${prop.iri}_${prop.target}`,
          title: prop.label,
        });
      });
      return edges;
    };
    const _createInstanceOfEdges = (instance) => {
      const edges = [];
      for (const iri of instance.classIris) {
        const clazz = _nodes.get(iri);
        edges.push({
          id: `${instance.iri}_instance_of_${clazz.id}`,
          from: instance.iri,
          to: clazz.id,
          title: 'type of',
          tags: [_edgeTypes.INSTANCE_OF_EDGE],
          dashes: true
        });
      }
      return edges;
    };
    const _createSubClassOfEdges = (clazz) => {
      const edges = [];
      for (const iri of clazz.parentClassIris) {
        edges.push({
          id: `${clazz.iri}_subclass_of_${iri}`,
          from: clazz.iri,
          to: iri,
          title: 'subclass of',
          tags: [_edgeTypes.SUBCLASS_OF_EDGE],
          dashes: true
        });
      }
      return edges;
    };

    const _createObjectTypeEdges = (property) => {
      const edges = [];
      if ((property.domainIris.length === 0) || (property.rangeIris.length === 0)) {
        return edges;
      }
      for (const sourceIri of property.domainIris) {
        for (const targetIri of property.rangeIris) {
          edges.push({
            id: `${sourceIri}_${property.iri}_${targetIri}`,
            from: sourceIri,
            to: targetIri,
            title: property.label,
            filterLabels: [''],
          });
        }
      }
      return edges;
    };

    const _createObjectEdges = (individual) => {
      const edges = [];
      individual.objectProperties.forEach((prop) => {
        edges.push({
          id: `${individual.iri}_${prop.iri}_${prop.target}`,
          from: individual.iri,
          to: prop.target,
          title: prop.label,
          filterLabels: [''],
        });
      });
      return edges;
    };
    const _createClassNode = (clazz) => {
      return {
        id: clazz.iri,
        label: clazz.label,
        title: clazz.label,
        type: _nodeTypes.CLASS_NODE,
        group: _nodeTypes.CLASS_NODE,
        tags: [_nodeTypes.CLASS_NODE]

      };
    };
    const _findCaseLabels = (props, propIri, array = []) => {
      const caseLabels = [].concat(array);
      for (const prop of props) {
        if (prop.iri !== propIri) {
          continue;
        }
        const case_ = _cases.find((c) => {
          return c.iri === prop.target;
        });

        if (!case_) {
          continue;
        }
        const index = caseLabels.indexOf(case_.label);
        if (index < 0) {
          caseLabels.push(case_.label);
        }
      }
      return caseLabels;
    };
    const _createIndividualNode = (individual) => {
      const caseLabels = _findCaseLabels(individual.objectProperties, "http://www.AMSL/GDK/ontologie#ist_Bestandteil_von")
        .concat(_findCaseLabels(individual.reverseObjectProperties, "http://www.AMSL/GDK/ontologie#beinhaltet"));

      const group = (caseLabels.length === 0) ?  _tags.NO_CASE : caseLabels[0];
      const tags = (caseLabels.length === 0) ? [_nodeTypes.INDIVIDUAL_NODE, _tags.NO_CASE] : [_nodeTypes.INDIVIDUAL_NODE].concat(caseLabels);
      return {
        id: individual.iri,
        label: individual.label,
        title: individual.label,
        type: _nodeTypes.INDIVIDUAL_NODE,
        group: group,
        tags: tags
      };
    };

    const _showNeighbors = (nodeIds, depth) => {
      if (nodeIds === undefined || !Array.isArray(nodeIds)) {
        throw Error('Must be of type array!');
      }
      if (depth === undefined || depth < 0) {
        throw Error('Depth may not be lesser than 0!');
      }
      let neighborIds = [];
      const result = {
        nodes: [],
        edges: [],
      };
      nodeIds.forEach((id) => {
        const r = _findNeighbors(id, _nodes, _edges, _nodeFilters, depth);
        neighborIds = neighborIds.concat(r.neighbors);
      });
      _viewport.nodes.update(_nodes.get(neighborIds));
      result.nodes = _nodes.get(neighborIds);
      result.edges = _edges.get({
        filter: (edge) => {
          return _isEdgeHidden(edge, _viewport.nodes) === false;
      }});
      _viewport.edges.update(result.edges);
      return result;
    };

    const _findConnectingEdges = (nodeId, edgeDataset) => {
      if (nodeId === undefined) {
        throw Error("Node id is undefined.");
      }
      if (edgeDataset === undefined) {
        throw Error("Edge dataset is undefined.");
      }
      return edgeDataset.get({
        filter: (edge) => {
          return ((edge.to === nodeId) || (edge.from === nodeId)) && (edge.to !== edge.from);
        }
      });
    };

    const _findAdjacentNodes = (nodeId, nodeDataSet, edgeDataset) => {
      if (nodeId === undefined)  {
        throw Error("Node id is undefined.");
      }
      if (nodeDataSet === undefined) {
        throw Error("Node dataset is undefined.");
      }
      if (edgeDataset === undefined) {
        throw Error("Edge dataset is undefined.");
      }
      const connectingEdges = _findConnectingEdges(nodeId, edgeDataset);
      return nodeDataSet.getIds({
        filter: (node) => {
          const connectingEdge = connectingEdges.find((edge) => {
            return ((edge.to === node.id) || (edge.from === node.id));
          });
          return connectingEdge !== undefined;
        }
      });
    };

    const _isNodeHidden = (node, nodes, edges, filters) => {
      const hiddenNodeIds = [].concat.apply([], _hiddenNodeIdsStack);
      if (hiddenNodeIds.indexOf(node.id) > -1) {
        return true;
      }
      return !_applyItemFilters(node, nodes, edges, filters);
    };

    const _findNeighbors = (nodeId, nodeDataSet, edgeDataset, filters = [], depth = 0, visited = [], neighbors = []) => {
      if (nodeId === undefined)  {
        throw Error("Node id is undefined.");
      }
      if (nodeDataSet === undefined) {
        throw Error("Node dataset is undefined.");
      }
      if (edgeDataset === undefined) {
        throw Error("Edge dataset is undefined.");
      }
      if (!Array.isArray(visited)) {
        throw Error("Visited is not an array.");
      }
      if (!Array.isArray(filters)) {
        throw Error("Filters is not an array.");
      }
      const result = {
        visited: visited.slice(0),
        neighbors: neighbors.slice(0)
      };
      // if already visited or depth is less than zero, the node won't be part of the result
      if ((visited.indexOf(nodeId) > -1) || (depth < 0)) {
        return result;
      }
      // regardless if it's filtered out or not, this node was visited
      result.visited.push(nodeId);


      const isFilteredOut = _applyItemFilters(nodeDataSet.get(nodeId), nodeDataSet, edgeDataset, filters);
      // either the node is added to the result set, or
      // it is not in the current filters
      if (isFilteredOut === true) {
        result.neighbors.push(nodeId);
      } else {
        return result;
      }
      // nothing left to do
      if (depth === 0) {
        return result;
      }
      const adjacentNodeIds = _findAdjacentNodes(nodeId, nodeDataSet, edgeDataset);
      adjacentNodeIds.forEach((id) => {
        const r = _findNeighbors(id, nodeDataSet, edgeDataset, filters, depth - 1, result.visited, result.neighbors);
        //result.visited = result.visited.concat(r.visited);
        result.visited = r.visited;
        result.neighbors = r.neighbors;
      });
      return result;
    };

    const _isEdgeHidden = (edge, nodesDataset) => {
      const fromNode = nodesDataset.get(edge.from);
      const toNode = nodesDataset.get(edge.to);
      if ((fromNode === null) || (toNode === null)) {
        return true;
      }
      if ((fromNode.hidden === true) || (toNode.hidden === true)) {
        return true;
      }
      return false;
    };


    const _updateFilter = (id, enabled) => {
      const result = {
        nodes: [],
        edges: [],
      };
      if ((enabled !== true) && (enabled !== false)) {
        return result;
      }
      const filter = _nodeFilters.find((f) => {
        return f.id === id;
      });
      if (filter === undefined) {
        return result;
      }
      filter.enabled = enabled;
      result.nodes = _viewport.nodes.get().map((node) => {
        node.hidden = _isNodeHidden(node, _viewport.nodes, _viewport.edges, _nodeFilters);
        return node;
      });
      _viewport.nodes.update(result.nodes);

      result.edges = _viewport.edges.get().map((edge) => {
        edge.hidden = _isEdgeHidden(edge, _viewport.nodes);
        return edge;
      });
      _viewport.edges.update(result.edges);

      return result;
    };

    const _createItems = (objects, creationFunc, dataset) => {
      objects.forEach(function(object){
        dataset.add(creationFunc(object));
      });
    };
    const _createNodes = (objects, creationFunc) => {
      _createItems(objects, creationFunc, _nodes);
    };
    const _createEdges = (objects, creationFunc) => {
      _createItems(objects, creationFunc, _edges);
    };
    const _createViewport = () => {
      const result = {
        nodes: [],
        edges: [],
        stackSize: 0,
        filters: []
      };
      _hiddenNodeIdsStack = [];

      _nodeFilters = _createNodeFilters();
      _edgeFilters = _createEdgeFilters();

      _viewport.nodes.clear();
      _viewport.edges.clear();

      _viewport.nodes.add(_applyNodeFilters(_nodes, _edges, _nodeFilters));
      _viewport.edges.add(_applyEdgeFilters(_nodes, _edges, _edgeFilters));
      result.nodes = _viewport.nodes.get();
      result.edges = _viewport.edges.get();
      result.filters = _createNodeFilters()
        .concat(_createEdgeFilters())
        .filter((f) => {
          return f.isVisible === true;
        });
      return result;
    };

    const _createEdgeFilters = () => {
      const filters = [];

      return filters;
    };

    const _createNodeFilters = () => {
      const filters = [];

      // node type filters
      filters.push(new TypeFilter(1, _nodeTypes.CLASS_NODE, "Class Nodes", true, true, false));
      filters.push(new TypeFilter(1, _nodeTypes.INDIVIDUAL_NODE, "Individual Nodes", false, true, false));
      filters.push(new TypeFilter(1, _nodeTypes.DATA_NODE, "Data Nodes", true, true, false));

      // case filters
      filters.push(new TagFilter(2, _tags.NO_CASE, "Nodes without cases", true,  false));
      _cases.forEach((c) => {
        filters.push(new TagFilter(2, c.label, c.label, true, false));
      });

      // TODO: unconnected nodes filter

      filters.sort((f1, f2) => {
        return f1.priority > f2.priority;
      });
      return filters;
    };

    const _applyItemFilters = (item, nodes, edges, filters = []) => {
      if (item === undefined) {
        throw Error("Item may not be undefined.");
      }
      if (!Array.isArray(filters)) {
        throw Error("Filters must be an array.");
      }
      for (const filter of filters) {
        if (filter.enabled !== true) {
          continue;
        }
        // filter out all that not fit the filter
        if (filter.filter(item, nodes, edges) === true) {
          return false;
        }
      }
      return true;
    };

    const _applyNodeFilters = (nodes, edges, filters = []) => {
      if (nodes === undefined) {
        throw Error("DataSet may not be undefined.");
      }
      if (edges === undefined) {
        throw Error("DataSet may not be undefined.");
      }
      const newArray = nodes.get({
        filter: (item) => {
          return _applyItemFilters(item, nodes, edges, filters);
        }
      });
      return newArray;
    };


    const _applyEdgeFilters = (nodes, edges, filters = []) => {

      if (nodes === undefined) {
        throw Error("DataSet may not be undefined.");
      }
      if (edges === undefined) {
        throw Error("DataSet may not be undefined.");
      }
      const newArray = edges.get({
        filter: (item) => {
          return _applyItemFilters(item, nodes, edges, filters);
        }
      });
      return newArray;
    };


    const _createNodesAndEdges = (classes, individuals, objectProperties) => {
      // filter out the cases
      _cases = individuals.filter((i) => {
        return CaseOntologyDataService.isCase(i);
      });
      individuals = individuals.filter((i) => {
        return !CaseOntologyDataService.isCase(i);
      });
      // updating filter labels
      _cases.forEach((c) => {
        _tags[c.label] = c.label;
      });

      // add all class nodes
      _createNodes(classes, _createClassNode);
      // add all individual nodes
      _createNodes(individuals, _createIndividualNode);
      // add all datatype nodes
      _createNodes(individuals, _createDatatypeNodes);

      // add all datatype edges
      _createEdges(individuals, _createDatatypeEdges);
      // add subclass edges for class nodes
      _createEdges(classes, _createSubClassOfEdges);
      // add objectProperty edges between classes
      _createEdges(objectProperties, _createObjectTypeEdges);
      // add instance of edges for individual nodes
      _createEdges(individuals, _createInstanceOfEdges);
      // add objectProperty edges between individuals
      _createEdges(individuals, _createObjectEdges);

      // filter out all edges which are not connected or belonging to a case
      // TODO
    };

    const _initialize = () => {
      if (_initialized === true) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        Promise.all([
          CaseOntologyDataService.initialize(),
          OntologyDataService.initialize(),
        ]).then(() => {
          return Promise.all([
            OntologyDataService.fetchAllClasses({superClasses: true}),
            OntologyDataService.fetchAllIndividuals({ datatypeProperties: true, objectProperties: true }),
            OntologyDataService.fetchAllObjectProperties({domain: true, range: true}),
          ]);
        }).then((result) => {
          try {
            _createNodesAndEdges(result[0], result[1], result[2]);
            _initialized = true;
            resolve(_createViewport());
          } catch(e) {
            reject(e);
          }
        }).catch((err) => {
          reject(err);
        });
      });
    };

    return {
      initialize: () => {
        return _initialize();
      },
      hideNodes: (nodeIds) => {
        return new Promise((resolve, reject) => {
          try {
            resolve(_hide(nodeIds));
          } catch(e) {
            reject(e);
          }
        });
      },
      focusNodes: (nodeIds) => {
        return new Promise((resolve, reject) => {
          try {
            resolve(_focusNodes(nodeIds));
          } catch(e) {
            reject(e);
          }
        });
      },
      showNeighbors: (nodeIds, depth) => {
        return new Promise((resolve, reject) => {
          try {
            resolve(_showNeighbors(nodeIds, depth));
          } catch(e) {
            reject(e);
          }
        });
      },
      showNodes: () => {
        return new Promise((resolve, reject) => {
          try {
            resolve(_show());
          } catch(e) {
            reject(e);
          }
        });
      },
      reset: () => {
        return new Promise((resolve, reject) => {
          try {
            resolve(_createViewport());
          } catch(e) {
            reject(e);
          }
        });
      },
      tags: () => {
        return _tags;
      },
      updateFilter: (id, enabled) => {
        return new Promise((resolve, reject) => {
          try {
            resolve(_updateFilter(id, enabled));
          } catch(e) {
            reject(e);
          }
        });
      },
      nodeTypes: _nodeTypes,
    };

  }
  module.exports = GraphService;

})(global.vis);


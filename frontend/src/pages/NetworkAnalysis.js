import React, { useState, useEffect, useRef } from 'react';
import { Network, Users, Activity, Filter, Download, BarChart2, PlayCircle } from 'lucide-react';
import * as d3 from 'd3';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import withProjectRequired from '../hoc/withProjectRequired';

const NetworkAnalysis = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [networkData, setNetworkData] = useState(null);
  const [networkStats, setNetworkStats] = useState({
    nodes: 0,
    links: 0,
    density: 0,
    avgDegree: 0
  });
  const [showCommunities, setShowCommunities] = useState(false);
  const [highlightMode, setHighlightMode] = useState('none'); // none, department, centrality
  const [nodeSize, setNodeSize] = useState('degree'); // degree, betweenness, closeness
  const [filteredDepartment, setFilteredDepartment] = useState('all');
  const [departments, setDepartments] = useState(['all']);

  const networkContainer = useRef(null);
  const svgRef = useRef(null);

  // Load datasets when component mounts
  useEffect(() => {
    fetchDatasets();
  }, []);

  // When selected dataset changes, load network data
  useEffect(() => {
    if (selectedDataset) {
      loadNetworkData(selectedDataset);
    }
  }, [selectedDataset]);

  // When network data changes, render the visualization
  useEffect(() => {
    if (networkData && networkContainer.current) {
      renderNetworkVisualization();
    }
  }, [networkData, showCommunities, highlightMode, nodeSize, filteredDepartment]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (networkData && networkContainer.current) {
        renderNetworkVisualization();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [networkData]);

  const fetchDatasets = async () => {
    try {
      setLoading(true);

      // Get datasets with network data
      const response = await api.get('/datasets');

      // Filter for processed datasets - prioritize them by 'processed' dataset_type
      const networkDatasets = response.data.filter(dataset =>
        dataset.dataset_type === 'processed' ||
        dataset.name.toLowerCase().includes('processed') ||
        dataset.name.toLowerCase().includes('communication') ||
        dataset.description.toLowerCase().includes('network')
      );

      setDatasets(networkDatasets);

      // Auto-select the most recent processed dataset if available
      if (networkDatasets.length > 0) {
        // Prioritize processed datasets
        const processedDatasets = networkDatasets.filter(ds =>
          ds.dataset_type === 'processed' || ds.name.toLowerCase().includes('processed')
        );

        // Sort by date (newest first) and take the first one
        const datasetToUse = (processedDatasets.length > 0 ? processedDatasets : networkDatasets)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

        setSelectedDataset(datasetToUse.id);
      }

    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError(err.response?.data?.detail || 'Error loading datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadNetworkData = async (datasetId) => {
    try {
      setLoading(true);
      setNetworkData(null);

      // Use the new dedicated network visualization endpoint
      const response = await api.get(`/networks/${datasetId}/visualization`);
      const networkVisualization = response.data;

      // Process nodes to ensure consistent structure
      const nodes = (networkVisualization.nodes || []).map(node => {
        if (!node) return null;
        return {
          id: node.employee_id ? String(node.employee_id) : null, // Ensure ID is a string
          department: node.department || 'Unknown',
          role: node.role || 'Unknown',
          degree: parseFloat(node.degree_centrality || 0),
          betweenness: parseFloat(node.betweenness_centrality || 0),
          closeness: parseFloat(node.closeness_centrality || 0),
          clustering: parseFloat(node.clustering_coefficient || 0),
          community: parseInt(node.community_id || 0)
        };
      }).filter(node => node && node.id); // Filter out null nodes or nodes without ID

      // Links should already be in the right format
      const links = (networkVisualization.links || []).filter(link =>
        link &&
        (link.source || link.source === 0) &&
        (link.target || link.target === 0)
      );

      // Set network stats from the metrics provided by the API
      const stats = {
        nodes: networkVisualization.metrics.nodes_count,
        links: networkVisualization.metrics.edges_count,
        density: networkVisualization.metrics.density,
        avgDegree: networkVisualization.metrics.avg_degree
      };

      // Add departments to filter options if provided
      if (networkVisualization.departments && networkVisualization.departments.length > 0) {
        setDepartments(['all', ...networkVisualization.departments]);
      } else {
        // Otherwise extract them from nodes
        const deptSet = new Set(nodes.map(node => node.department));
        setDepartments(['all', ...Array.from(deptSet)]);
      }

      setNetworkData({ nodes, links });
      setNetworkStats(stats);

    } catch (err) {
      console.error('Error loading network data:', err);
      if (err.response?.status === 400) {
        // If the API indicates the dataset doesn't have network features
        setError("This dataset doesn't contain network analysis features. Try using a processed dataset or process your communication data first.");
      } else {
        setError(err.response?.data?.detail || 'Error loading network data');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderNetworkVisualization = () => {
    if (!networkData || !networkContainer.current) return;

    // Clear previous visualization
    d3.select(networkContainer.current).select('svg').remove();

    // Get container dimensions
    const containerWidth = networkContainer.current.clientWidth;
    const containerHeight = 600; // Set a fixed height or use clientHeight for full container

    // Create SVG
    const svg = d3.select(networkContainer.current)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', containerHeight)
      .attr('viewBox', [0, 0, containerWidth, containerHeight]);

    svgRef.current = svg;

    // Create a copy of the data for filtering
    let filteredNodes = [...networkData.nodes];
    let filteredLinks = [...networkData.links];

    // Apply department filter if needed
    if (filteredDepartment !== 'all') {
      filteredNodes = networkData.nodes.filter(node => node.department === filteredDepartment);
      const nodeIds = new Set(filteredNodes.map(node => node.id));
      filteredLinks = networkData.links.filter(link =>
        nodeIds.has(link.source.id || link.source) &&
        nodeIds.has(link.target.id || link.target)
      );
    }

    // Process links to ensure source and target are properly formatted
    const processedLinks = filteredLinks.map(link => {
      // Create a new object to avoid mutating the original data
      return {
        ...link,
        // Ensure source and target are IDs, not objects, and convert to strings
        source: typeof link.source === 'object' ? (link.source ? String(link.source.id) : '0') : String(link.source),
        target: typeof link.target === 'object' ? (link.target ? String(link.target.id) : '0') : String(link.target)
      };
    }).filter(link => link.source && link.target); // Filter out invalid links

    // Create a force simulation
    const simulation = d3.forceSimulation(filteredNodes)
      .force('link', d3.forceLink(processedLinks)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(containerWidth / 2, containerHeight / 2))
      .force('x', d3.forceX(containerWidth / 2).strength(0.1))
      .force('y', d3.forceY(containerHeight / 2).strength(0.1));

    // If showing communities, run community detection algorithm
    let communities = null;
    if (showCommunities) {
      // Simple community detection using connected components
      communities = detectCommunities(filteredNodes, filteredLinks);

      // Assign community colors
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      communities.forEach((community, i) => {
        community.forEach(nodeId => {
          const node = filteredNodes.find(n => n.id === nodeId);
          if (node) node.community = i;
        });
      });
    }

    // Create a color scale for departments
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain(departments.filter(d => d !== 'all'));

    // Add a container for the network
    const container = svg.append('g');

    // Create a group for links
    const linkGroup = container.append('g')
      .attr('class', 'links');

    // Create a group for nodes
    const nodeGroup = container.append('g')
      .attr('class', 'nodes');

    // Create links
    const link = linkGroup
      .selectAll('line')
      .data(processedLinks)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.weight || 1));

    // Determine node size based on selected metric
    const sizeScale = d3.scaleLinear()
      .domain([0, d3.max(filteredNodes, d => d[nodeSize] || 1) || 1])
      .range([5, 20]);

    // Create nodes
    const node = nodeGroup
      .selectAll('circle')
      .data(filteredNodes)
      .join('circle')
      .attr('r', d => {
        if (nodeSize === 'degree') return sizeScale(d.degree || 1);
        if (nodeSize === 'betweenness') return sizeScale(d.betweenness || 1);
        if (nodeSize === 'closeness') return sizeScale(d.closeness || 1);
        return 8; // Default size
      })
      .attr('fill', d => {
        if (showCommunities && d.community !== undefined) {
          return d3.schemeCategory10[d.community % 10];
        }
        if (highlightMode === 'department') {
          return colorScale(d.department);
        }
        if (highlightMode === 'centrality') {
          // Use a color gradient based on betweenness centrality
          const value = d.betweenness || 0;
          return d3.interpolateBlues(value * 5 + 0.3); // Scale factor to make differences visible
        }
        return '#1f77b4'; // Default color
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .call(drag(simulation))
      .on('mouseover', handleNodeMouseOver)
      .on('mouseout', handleNodeMouseOut)
      .on('click', handleNodeClick);

    // Create node labels for better visibility
    const nodeLabels = nodeGroup
      .selectAll('text')
      .data(filteredNodes)
      .join('text')
      .attr('dx', d => sizeScale(d[nodeSize] || 1) + 5) // Position to the right of node
      .attr('dy', '.35em')
      .text(d => d.role ? d.role.substring(0, 12) : d.id.substring(0, 6))
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .style('pointer-events', 'none') // Don't interfere with mouse events
      .style('opacity', 0) // Hide by default, show on hover/focus
      .attr('class', d => `label-${String(d.id).replace(/\W/g, '_')}`);

    // Create tooltips with more detailed info
    const tooltip = d3.select(networkContainer.current)
      .append('div')
      .attr('class', 'network-tooltip')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('box-shadow', '0 1px 2px rgba(0,0,0,0.2)')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // Handle node mouseover - highlight node and connections
    function handleNodeMouseOver(event, d) {
      const nodeId = d.id;

      // Dim all nodes and links
      node.attr('opacity', 0.3);
      link.attr('opacity', 0.1);

      // Highlight the selected node
      d3.select(this).attr('opacity', 1)
        .attr('stroke', '#ff4500')
        .attr('stroke-width', 2.5);

      // Find connected links and nodes
      const stringNodeId = String(nodeId);
      const connectedLinks = processedLinks.filter(l =>
        String(l.source) === stringNodeId || String(l.target) === stringNodeId
      );

      const connectedNodeIds = new Set();
      connectedLinks.forEach(l => {
        // Links are now normalized to always have string IDs
        connectedNodeIds.add(String(l.source));
        connectedNodeIds.add(String(l.target));
      });

      // Highlight connected nodes
      node.filter(n => connectedNodeIds.has(String(n.id)))
        .attr('opacity', 1)
        .attr('stroke', '#909');

      // Highlight connected links
      link.filter(l =>
        String(l.source) === stringNodeId || String(l.target) === stringNodeId
      )
        .attr('stroke', '#ff4500')
        .attr('stroke-opacity', 1)
        .attr('stroke-width', d => Math.sqrt(d.weight || 1) + 1);

      // Show this node's label
      nodeLabels.filter(n => String(n.id) === String(nodeId))
        .style('opacity', 1)
        .style('font-weight', 'bold');

      // Show tooltip with detailed info
      tooltip
        .html(`
          <div>
            <strong>ID:</strong> ${d.id}<br/>
            <strong>Department:</strong> ${d.department}<br/>
            <strong>Role:</strong> ${d.role || 'N/A'}<br/>
            <strong>Degree:</strong> ${(d.degree || 0).toFixed(3)}<br/>
            <strong>Betweenness:</strong> ${(d.betweenness || 0).toFixed(3)}<br/>
            <strong>Closeness:</strong> ${(d.closeness || 0).toFixed(3)}<br/>
            <strong>Connections:</strong> ${connectedLinks.length}
          </div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px')
        .style('opacity', 1);
    }

    // Handle node mouseout - restore normal view
    function handleNodeMouseOut() {
      // Restore all nodes and links
      node.attr('opacity', 1)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
      link.attr('opacity', 1)
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.weight || 1));

      // Hide all labels
      nodeLabels.style('opacity', 0)
        .style('font-weight', 'normal');

      // Hide tooltip
      tooltip.style('opacity', 0);
    }

    // Handle node click - focus on node and show detailed panel
    function handleNodeClick(event, d) {
      // Stop the event from bubbling up
      event.stopPropagation();

      // First reset any previous selection
      node.classed('selected', false);

      // Mark this node as selected
      d3.select(this).classed('selected', true);

      // Create a detailed panel or update if it exists
      const detailsPanel = d3.select(networkContainer.current).selectAll('.node-details-panel');

      if (!detailsPanel.empty()) {
        // Update existing panel
        detailsPanel.html(`
          <h3 class="text-lg font-bold mb-2">Node Details</h3>
          <p><strong>ID:</strong> ${d.id}</p>
          <p><strong>Department:</strong> ${d.department}</p>
          <p><strong>Role:</strong> ${d.role || 'N/A'}</p>
          <p><strong>Centrality Metrics:</strong></p>
          <ul class="pl-4 list-disc">
            <li>Degree: ${(d.degree || 0).toFixed(3)}</li>
            <li>Betweenness: ${(d.betweenness || 0).toFixed(3)}</li>
            <li>Closeness: ${(d.closeness || 0).toFixed(3)}</li>
          </ul>
        `);
      } else {
        // Create new panel
        d3.select(networkContainer.current)
          .append('div')
          .attr('class', 'node-details-panel')
          .style('position', 'absolute')
          .style('right', '10px')
          .style('top', '10px')
          .style('width', '250px')
          .style('background', 'white')
          .style('padding', '12px')
          .style('border-radius', '8px')
          .style('box-shadow', '0 2px 10px rgba(0,0,0,0.1)')
          .html(`
            <h3 class="text-lg font-bold mb-2">Node Details</h3>
            <p><strong>ID:</strong> ${d.id}</p>
            <p><strong>Department:</strong> ${d.department}</p>
            <p><strong>Role:</strong> ${d.role || 'N/A'}</p>
            <p><strong>Centrality Metrics:</strong></p>
            <ul class="pl-4 list-disc">
              <li>Degree: ${(d.degree || 0).toFixed(3)}</li>
              <li>Betweenness: ${(d.betweenness || 0).toFixed(3)}</li>
              <li>Closeness: ${(d.closeness || 0).toFixed(3)}</li>
            </ul>
            <div class="mt-4">
              <button class="close-btn text-sm px-2 py-1 bg-gray-200 rounded">Close</button>
            </div>
          `)
          .on('click', function(event) {
            // Prevent click from propagating
            event.stopPropagation();
          })
          .select('.close-btn')
          .on('click', function() {
            // Close panel and reset node selection
            d3.select(networkContainer.current).selectAll('.node-details-panel').remove();
            node.classed('selected', false);
          });
      }

      // Center camera on the selected node with animation
      const dx = containerWidth / 2 - d.x;
      const dy = containerHeight / 2 - d.y;

      container.transition()
        .duration(750)
        .attr('transform', `translate(${dx},${dy})`);
    }

    // Add simulation tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', d => {
          if (!d.source) return 0;
          // Source could be either an object (with x,y) or a string ID
          const sourceNode = typeof d.source === 'object' ? d.source : filteredNodes.find(n => n && n.id === d.source);
          return sourceNode ? sourceNode.x || 0 : 0;
        })
        .attr('y1', d => {
          if (!d.source) return 0;
          const sourceNode = typeof d.source === 'object' ? d.source : filteredNodes.find(n => n && n.id === d.source);
          return sourceNode ? sourceNode.y || 0 : 0;
        })
        .attr('x2', d => {
          if (!d.target) return 0;
          const targetNode = typeof d.target === 'object' ? d.target : filteredNodes.find(n => n && n.id === d.target);
          return targetNode ? targetNode.x || 0 : 0;
        })
        .attr('y2', d => {
          if (!d.target) return 0;
          const targetNode = typeof d.target === 'object' ? d.target : filteredNodes.find(n => n && n.id === d.target);
          return targetNode ? targetNode.y || 0 : 0;
        });

      node
        .attr('cx', d => d ? (d.x || 0) : 0)
        .attr('cy', d => d ? (d.y || 0) : 0);

      nodeLabels
        .attr('x', d => d ? (d.x || 0) : 0)
        .attr('y', d => d ? (d.y || 0) : 0);
    });

    // Add legend
    if (highlightMode === 'department' || showCommunities) {
      const legendData = showCommunities
        ? communities.map((c, i) => ({ name: `Community ${i+1}`, color: d3.schemeCategory10[i % 10] }))
        : departments.filter(d => d !== 'all')
          .map(d => ({ name: d, color: colorScale(d) }));

      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${containerWidth - 150}, 20)`);

      const legendTitle = legend.append('text')
        .attr('class', 'legend-title')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .text(showCommunities ? 'Communities' : 'Departments');

      const legendItem = legend.selectAll('.legend-item')
        .data(legendData)
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20 + 20})`);

      legendItem.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('rx', 2)
        .attr('fill', d => d.color);

      legendItem.append('text')
        .attr('x', 15)
        .attr('y', 5)
        .attr('dy', '0.35em')
        .style('font-size', '10px')
        .text(d => d.name);
    }

    // Implement drag behavior for nodes
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    // Implement zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Add double-click to reset zoom
    svg.on('dblclick.zoom', function() {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([containerWidth / 2, containerHeight / 2])
      );
    });

    // Add click on background to clear selection
    svg.on('click', function() {
      // Remove details panel if it exists
      d3.select(networkContainer.current).selectAll('.node-details-panel').remove();
      // Clear node selection
      node.classed('selected', false);
    });

    // Add instructions tooltip
    d3.select(networkContainer.current)
      .append('div')
      .attr('class', 'instructions')
      .style('position', 'absolute')
      .style('left', '10px')
      .style('bottom', '10px')
      .style('background', 'rgba(0, 0, 0, 0.7)')
      .style('color', 'white')
      .style('padding', '8px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0.8)
      .html(`
        <div>
          <p><strong>Mouse interactions:</strong></p>
          <p>• Hover over nodes to see connections</p>
          <p>• Click node for details</p>
          <p>• Drag to reposition</p>
          <p>• Scroll to zoom</p>
          <p>• Double-click to reset view</p>
        </div>
      `);
  };

  // Simple community detection function
  const detectCommunities = (nodes, links) => {
    // Check for empty data
    if (!nodes || !nodes.length || !links || !links.length) {
      return [];
    }

    // Filter out nodes with no ID
    const validNodes = nodes.filter(node => node && node.id);
    if (!validNodes.length) return [];

    // Create a map from node id to index, ensuring all IDs are strings
    const nodeMap = new Map(validNodes.map((node, i) => [String(node.id), i]));

    // Create an adjacency list
    const adj = Array(validNodes.length).fill().map(() => []);
    links.forEach(link => {
      const sourceId = link.source?.id || link.source;
      const targetId = link.target?.id || link.target;

      // Skip if either source or target is invalid
      if (!sourceId || !targetId) return;

      const sourceStringId = String(sourceId);
      const targetStringId = String(targetId);

      const sourceIdx = nodeMap.get(sourceStringId);
      const targetIdx = nodeMap.get(targetStringId);

      if (sourceIdx !== undefined && targetIdx !== undefined) {
        adj[sourceIdx].push(targetIdx);
        adj[targetIdx].push(sourceIdx);
      }
    });

    // Use a simple BFS to find connected components
    const visited = new Array(validNodes.length).fill(false);
    const communities = [];

    for (let i = 0; i < validNodes.length; i++) {
      if (!visited[i]) {
        const community = [];
        const queue = [i];
        visited[i] = true;

        while (queue.length > 0) {
          const node = queue.shift();
          community.push(String(validNodes[node].id));

          for (const neighbor of adj[node]) {
            if (!visited[neighbor]) {
              visited[neighbor] = true;
              queue.push(neighbor);
            }
          }
        }

        communities.push(community);
      }
    }

    return communities;
  };

  const exportNetworkVisualization = () => {
    if (!svgRef.current) return;

    // Create a copy of the SVG
    const svgCopy = svgRef.current.node().cloneNode(true);

    // Convert SVG to string
    const svgData = new XMLSerializer().serializeToString(svgCopy);

    // Create a Blob with the SVG data
    const blob = new Blob([svgData], { type: 'image/svg+xml' });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network_visualization.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Network Analysis</h1>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded flex items-center"
            onClick={() => navigate('/simulation', { state: { datasetId: selectedDataset } })}
            disabled={!selectedDataset}
          >
            <PlayCircle size={16} className="mr-1" /> Run Simulation
          </button>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded flex items-center"
            onClick={exportNetworkVisualization}
            disabled={!networkData}
          >
            <Download size={16} className="mr-1" /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center mb-6">
            <div className="flex-1 mb-4 md:mb-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Dataset</label>
              <select
                value={selectedDataset || ''}
                onChange={(e) => setSelectedDataset(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select a dataset</option>
                {datasets.map(dataset => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.name} ({dataset.record_count} records)
                  </option>
                ))}
              </select>

              {networkData && (
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <h3 className="font-medium text-blue-800 mb-2">Simulation Insights</h3>
                  <p className="text-sm text-blue-700">
                    This network has a {networkStats.density < 0.3 ? 'low' : networkStats.density > 0.6 ? 'high' : 'moderate'} density of {networkStats.density.toFixed(2)},
                    suggesting {networkStats.density < 0.3 ? 'limited communication pathways that could be improved through targeted interventions.' :
                      networkStats.density > 0.6 ? 'strong interconnectivity that could benefit from streamlining some communication channels.' :
                      'a balanced communication structure that maintains information flow without overloading employees.'}
                  </p>
                  <div className="mt-2">
                    <button
                      className="text-sm text-blue-600 font-medium flex items-center"
                      onClick={() => navigate('/simulation', { state: { datasetId: selectedDataset } })}
                    >
                      <PlayCircle size={14} className="mr-1" /> Run simulation to test interventions
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 md:ml-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Node Size</label>
                  <select
                    value={nodeSize}
                    onChange={(e) => setNodeSize(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="degree">Degree Centrality</option>
                    <option value="betweenness">Betweenness Centrality</option>
                    <option value="closeness">Closeness Centrality</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Highlight Mode</label>
                  <select
                    value={highlightMode}
                    onChange={(e) => setHighlightMode(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="none">None</option>
                    <option value="department">Department</option>
                    <option value="centrality">Centrality</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center mb-6">
            <div className="flex-1 mb-4 md:mb-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Department</label>
              <select
                value={filteredDepartment}
                onChange={(e) => setFilteredDepartment(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept === 'all' ? 'All Departments' : dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:ml-4">
              <div className="flex items-center">
                <input
                  id="show-communities"
                  type="checkbox"
                  checked={showCommunities}
                  onChange={(e) => setShowCommunities(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show-communities" className="ml-2 block text-sm text-gray-700">
                  Detect Communities
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-gray-500">Loading network data...</div>
            </div>
          ) : networkData ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <Users className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm text-gray-500">Nodes</p>
                  <p className="text-2xl font-bold text-blue-700">{networkStats.nodes}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <Network className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-gray-500">Connections</p>
                  <p className="text-2xl font-bold text-green-700">{networkStats.links}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <Activity className="h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-sm text-gray-500">Avg. Connections</p>
                  <p className="text-2xl font-bold text-purple-700">{networkStats.avgDegree.toFixed(1)}</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 flex flex-col items-center justify-center">
                  <Filter className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-sm text-gray-500">Network Density</p>
                  <p className="text-2xl font-bold text-yellow-700">{networkStats.density.toFixed(3)}</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg" style={{ height: '600px' }} ref={networkContainer}>
                {/* D3 visualization will be rendered here */}
              </div>

              <div className="mt-4 text-sm text-gray-500">
                <p>Drag nodes to reposition them. Use mouse wheel to zoom in/out. Click on nodes to see details.</p>

                <div className="flex space-x-3 mt-4">
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
                    onClick={() => navigate('/model-builder', {
                      state: {
                        datasetId: selectedDataset,
                        suggestedFeatures: [
                          'degree_centrality',
                          'betweenness_centrality',
                          'eigenvector_centrality',
                          'community_id',
                          'is_bridge'
                        ],
                        preSelectTarget: 'performance'
                      }
                    })}
                    disabled={!networkData}
                  >
                    <BarChart2 size={16} className="mr-1" /> Create Prediction Model
                  </button>

                  <button
                    className="px-4 py-2 bg-green-600 text-white rounded flex items-center"
                    onClick={() => navigate('/simulation', {
                      state: {
                        datasetId: selectedDataset
                      }
                    })}
                    disabled={!networkData}
                  >
                    <PlayCircle size={16} className="mr-1" /> Run Organization Simulation
                  </button>
                </div>

                <style jsx>{`
                  .network-tooltip {
                    z-index: 100;
                    font-size: 12px;
                    transition: opacity 0.2s;
                  }
                  .node-details-panel {
                    z-index: 50;
                    max-height: 80%;
                    overflow-y: auto;
                  }
                  circle {
                    transition: fill 0.2s, opacity 0.2s, stroke 0.2s;
                    cursor: pointer;
                  }
                  circle.selected {
                    stroke: #ff4500 !important;
                    stroke-width: 3px !important;
                  }
                `}</style>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Network className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Network Data Selected</h3>
              <p className="text-gray-500 text-center max-w-md mb-4">
                Select a dataset containing processed organizational data or communication data to visualize the network structure.
              </p>
              {datasets.length === 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p className="text-yellow-700">
                    No suitable datasets found. Process organization or communication data first.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withProjectRequired(NetworkAnalysis);
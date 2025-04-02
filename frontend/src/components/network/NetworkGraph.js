import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Card from '../ui/Card';

const NetworkGraph = ({ data, width = 800, height = 600, className = '', onNodeSelect = null }) => {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
      return;
    }

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Add a container for all network elements
    const container = svg.append("g");

    // Process links to ensure source and target are properly formatted
    const processedLinks = data.links.map(link => {
      return {
        ...link,
        source: typeof link.source === 'object' ? String(link.source.id) : String(link.source),
        target: typeof link.target === 'object' ? String(link.target.id) : String(link.target)
      };
    });

    // Create simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(processedLinks).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Define color scale based on department
    const departments = [...new Set(data.nodes.map(n => n.department || 'Unknown'))];
    const colorScale = d3.scaleOrdinal()
      .domain(departments)
      .range(d3.schemeCategory10);

    // Add links group
    const linkGroup = container.append("g")
      .attr("class", "links");

    // Add nodes group
    const nodeGroup = container.append("g")
      .attr("class", "nodes");

    // Ensure all node IDs are strings
    data.nodes.forEach(node => {
      if (node.id !== undefined) {
        node.id = String(node.id);
      }
    });

    // Add links
    const link = linkGroup
      .selectAll("line")
      .data(processedLinks)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => Math.sqrt(d.value || 1));

    // Calculate node sizes
    const maxDegree = d3.max(data.nodes, d => d.degree || 1) || 1;
    const sizeScale = d3.scaleLinear()
      .domain([0, maxDegree])
      .range([5, 15]);

    // Create node groups
    const node = nodeGroup
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", d => getSizeByProperty(d))
      .attr("fill", d => colorScale(d.department || 'Unknown'))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .call(drag(simulation))
      .on("mouseover", handleMouseOver)
      .on("mouseout", handleMouseOut)
      .on("click", handleNodeClick);

    // Add labels to nodes
    const labels = nodeGroup
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .attr("dy", "0.35em")
      .attr("x", d => getSizeByProperty(d) + 5)
      .attr("y", 0)
      .attr("text-anchor", "start")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .text(d => truncateText(d.name || d.id || ""))
      .style("pointer-events", "none")
      .style("opacity", 0); // Hide initially, show on hover

    // Add tooltips
    const tooltip = d3.select(svgRef.current.parentNode).append("div")
      .attr("class", "network-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "8px")
      .style("font-size", "12px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("z-index", "100")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("transition", "opacity 0.2s");

    // Node hover handler
    function handleMouseOver(event, d) {
      // Highlight node
      d3.select(this)
        .attr("stroke", "#ff4500")
        .attr("stroke-width", 2.5);

      // Show label
      labels.filter(n => String(n.id) === String(d.id))
        .style("opacity", 1);

      // Highlight connected links and nodes
      const connectedNodeIds = new Set();

      const nodeIdStr = String(d.id);

      link.each(function(l) {
        // Links are now normalized to always have string IDs as source/target
        const sourceStr = String(l.source);
        const targetStr = String(l.target);

        if (sourceStr === nodeIdStr || targetStr === nodeIdStr) {
          d3.select(this)
            .attr("stroke", "#ff4500")
            .attr("stroke-opacity", 1)
            .attr("stroke-width", d => Math.sqrt(d.value || 1) + 1);

          connectedNodeIds.add(sourceStr);
          connectedNodeIds.add(targetStr);
        }
      });

      // Highlight connected nodes
      node.filter(n => connectedNodeIds.has(String(n.id)) && String(n.id) !== nodeIdStr)
        .attr("stroke", "#ff4500")
        .attr("stroke-width", 1.5);

      // Show tooltip
      tooltip
        .style("visibility", "visible")
        .style("opacity", 1)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px")
        .html(`
          <div>
            <strong>${d.name || d.id}</strong><br/>
            <span>Dept: ${d.department || 'Unknown'}</span><br/>
            <span>Role: ${d.role || 'Unknown'}</span><br/>
            ${d.degree ? `<span>Degree: ${d.degree.toFixed(3)}</span>` : ''}
            ${d.betweenness ? `<br/><span>Betweenness: ${d.betweenness.toFixed(3)}</span>` : ''}
            ${d.closeness ? `<br/><span>Closeness: ${d.closeness.toFixed(3)}</span>` : ''}
            ${d.community ? `<br/><span style="color:#6366f1">Community: ${d.community}</span>` : ''}
            <div style="margin-top:4px; font-size:9px; color:#666;">Click for details or run simulation</div>
          </div>
        `);
    }

    // Node mouseout handler
    function handleMouseOut(event, d) {
      // Restore node appearance
      node.attr("stroke", function(n) {
        return n.id === selectedNode?.id ? "#ff4500" : "#fff";
      })
        .attr("stroke-width", function(n) {
          return n.id === selectedNode?.id ? 2.5 : 1.5;
        });

      // Hide label
      labels.filter(n => String(n.id) === String(d.id) && (!selectedNode || String(n.id) !== String(selectedNode.id)))
        .style("opacity", 0);

      // Restore links
      link.attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.sqrt(d.value || 1));

      // Hide tooltip
      tooltip.style("opacity", 0)
        .style("visibility", "hidden");
    }

    // Node click handler
    function handleNodeClick(event, d) {
      // Prevent event bubbling
      event.stopPropagation();

      // Update state
      setSelectedNode(d);

      // Reset all nodes
      node.attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      // Highlight selected node
      d3.select(this)
        .attr("stroke", "#ff4500")
        .attr("stroke-width", 2.5);

      // Show labels for selected node
      labels.style("opacity", n => String(n.id) === String(d.id) ? 1 : 0);

      // Call external handler if provided
      if (onNodeSelect) {
        onNodeSelect(d);
      }

      // Center view on node with transition
      const dx = width / 2 - d.x;
      const dy = height / 2 - d.y;

      container.transition()
        .duration(750)
        .attr("transform", `translate(${dx},${dy})`);
    }

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => {
          const sourceId = typeof d.source === 'object' ? String(d.source.id) : String(d.source);
          const sourceNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => String(n.id) === sourceId);
          return sourceNode ? sourceNode.x : 0;
        })
        .attr("y1", d => {
          const sourceId = typeof d.source === 'object' ? String(d.source.id) : String(d.source);
          const sourceNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => String(n.id) === sourceId);
          return sourceNode ? sourceNode.y : 0;
        })
        .attr("x2", d => {
          const targetId = typeof d.target === 'object' ? String(d.target.id) : String(d.target);
          const targetNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => String(n.id) === targetId);
          return targetNode ? targetNode.x : 0;
        })
        .attr("y2", d => {
          const targetId = typeof d.target === 'object' ? String(d.target.id) : String(d.target);
          const targetNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => String(n.id) === targetId);
          return targetNode ? targetNode.y : 0;
        });

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      labels
        .attr("x", d => d.x + getSizeByProperty(d) + 5)
        .attr("y", d => d.y);
    });

    // Clear selection when clicking on background
    svg.on("click", () => {
      setSelectedNode(null);
      node.attr("stroke", "#fff")
        .attr("stroke-width", 1.5);
      labels.style("opacity", 0);
    });

    // Implement zoom
    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Double-click to reset zoom
    svg.on("dblclick.zoom", function() {
      svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
      );
    });

    // Size based on role or degree
    function getSizeByProperty(d) {
      if (d.degree) {
        return sizeScale(d.degree);
      } else {
        switch (d.role?.toLowerCase()) {
          case 'manager': return 12;
          case 'team_lead': return 10;
          case 'ceo': return 16;
          case 'cto': case 'cfo': case 'coo': case 'cmo': return 14;
          default: return 8;
        }
      }
    }

    // Truncate text based on length
    function truncateText(text) {
      return text.length > 12 ? text.substring(0, 10) + '...' : text;
    }

    // Drag functionality
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
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Add a legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 10)`);

    // Only show departments if we have multiple
    if (departments.length > 1) {
      // Legend title
      legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.32em")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text("Departments");

      // Legend items (limit to top 7)
      const displayDepts = departments.slice(0, Math.min(7, departments.length));
      displayDepts.forEach((dept, i) => {
        const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${i * 15 + 20})`);

        legendRow.append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("rx", 2)
          .attr("ry", 2)
          .attr("fill", colorScale(dept));

        legendRow.append("text")
          .attr("x", 15)
          .attr("y", 5)
          .attr("dy", "0.32em")
          .attr("font-size", "10px")
          .text(truncateText(dept));
      });

      // If we truncated the departments list, add an ellipsis
      if (departments.length > 7) {
        legend.append("text")
          .attr("transform", `translate(0, ${7 * 15 + 20})`)
          .attr("x", 5)
          .attr("y", 5)
          .attr("font-size", "10px")
          .text(`+${departments.length - 7} more...`);
      }
    }

    // Cleanup function
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, width, height, selectedNode, onNodeSelect]);

  return (
    <Card
      className={className}
      title={<h3 className="text-lg font-semibold">Organizational Network</h3>}
    >
      <div className="flex justify-center relative">
        <svg ref={svgRef} className="network-graph" />

        {selectedNode && (
          <div className="absolute top-2 right-2 bg-white p-3 rounded shadow-md text-sm max-w-xs">
            <h4 className="font-bold mb-1">{selectedNode.name || selectedNode.id}</h4>
            <p><span className="font-medium">Department:</span> {selectedNode.department || 'Unknown'}</p>
            <p><span className="font-medium">Role:</span> {selectedNode.role || 'Unknown'}</p>
            {selectedNode.degree && (
              <p><span className="font-medium">Centrality:</span> {selectedNode.degree.toFixed(3)}</p>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .network-graph {
          min-height: 300px;
        }
        .network-tooltip {
          z-index: 10;
          pointer-events: none;
        }
      `}</style>
    </Card>
  );
};

export default NetworkGraph;
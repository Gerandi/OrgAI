import React from 'react'; 
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'; 
import { Download, Info } from 'lucide-react'; 
import Card from '../ui/Card'; 

const SimulationResults = ({ 
data = [], 
networkData = {}, 
interventions = [], 
insights = '', 
exportSimulation, 
className = '' 
}) => { 
// Chart color palette 
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']; 

// Format for the tooltip 
const valueFormatter = (value) => `${parseFloat(value).toFixed(1)}`; 

// Mark months with interventions 
const markedMonths = interventions.map(i => i.month); 

return ( 
<Card 
className={className} 
title={ 
<div className="flex justify-between items-center"> 
<h3 className="text-lg font-semibold">Simulation Results</h3> 
<button 
className="text-blue-600 text-sm font-medium flex items-center" 
onClick={exportSimulation} 
disabled={data.length === 0} 
> 
<Download size={16} className="mr-1" /> Export Data 
</button> 
</div> 
} 
> 
{data.length === 0 ? ( 
<div className="h-64 flex flex-col items-center justify-center text-gray-500 space-y-2"> 
<Info size={48} className="text-gray-300" /> 
<p>Run the simulation to see results</p> 
</div> 
) : ( 
<div className="space-y-6"> 
{/* Performance Chart */} 
<div> 
<h4 className="font-medium mb-2">Performance and Innovation Trends</h4> 
<div className="h-64"> 
<ResponsiveContainer width="100%" height="100%"> 
<LineChart data={data}> 
<CartesianGrid strokeDasharray="3 3" /> 
<XAxis 
dataKey="month" 
label={{ value: 'Month', position: 'insideBottom', offset: -5 }} 
/> 
<YAxis 
domain={[0, 100]} 
label={{ value: 'Score', angle: -90, position: 'insideLeft' }} 
/> 
<Tooltip formatter={valueFormatter} /> 
<Legend /> 
<Line 
type="monotone" 
dataKey="performance" 
name="Performance" 
stroke="#0088FE" 
strokeWidth={2} 
/> 
<Line 
type="monotone" 
dataKey="innovation" 
name="Innovation" 
stroke="#00C49F" 
strokeWidth={2} 
/> 
<Line 
type="monotone" 
dataKey="satisfaction" 
name="Satisfaction" 
stroke="#FFBB28" 
strokeWidth={2} 
/> 

{/* Add vertical lines for interventions */} 
{interventions.map(intervention => ( 
<ReferenceLine 
key={intervention.id} 
x={intervention.month} 
stroke="#FF8042" 
strokeDasharray="3 3" 
label={{ 
value: intervention.name || intervention.type, 
position: 'insideTopRight', 
style: { fontSize: '10px', fill: '#FF8042' } 
}} 
/> 
))} 
</LineChart> 
</ResponsiveContainer> 
</div> 
</div> 

{/* Stacked Area Chart - showing the relationship between metrics */} 
<div> 
<h4 className="font-medium mb-2">Organizational Dynamics</h4> 
<div className="h-56"> 
<ResponsiveContainer width="100%" height="100%"> 
<AreaChart 
data={data} 
margin={{ top: 10, right: 30, left: 0, bottom: 0 }} 
> 
<CartesianGrid strokeDasharray="3 3" /> 
<XAxis dataKey="month" /> 
<YAxis domain={[0, 100]} /> 
<Tooltip formatter={valueFormatter} /> 
<Legend /> 
<Area 
type="monotone" 
dataKey="satisfaction" 
name="Satisfaction" 
stackId="1" 
stroke="#FFBB28" 
fill="#FFBB28" 
fillOpacity={0.6} 
/> 
<Area 
type="monotone" 
dataKey="innovation" 
name="Innovation" 
stackId="2" 
stroke="#00C49F" 
fill="#00C49F" 
fillOpacity={0.6} 
/> 
<Area 
type="monotone" 
dataKey="performance" 
name="Performance" 
stackId="3" 
stroke="#0088FE" 
fill="#0088FE" 
fillOpacity={0.6} 
/> 
</AreaChart> 
</ResponsiveContainer> 
</div> 
</div> 

{/* Organizational Network Summary */} 
<div className="bg-blue-50 rounded p-4 border border-blue-100"> 
<h4 className="font-medium mb-3">Organizational Network Analysis</h4> 
<div className="grid grid-cols-1 md:grid-cols-4 gap-4"> 
<div className="bg-white p-3 rounded shadow-sm"> 
<div className="text-sm text-gray-500">Communication Density</div> 
<div className="text-xl font-medium">{networkData.density?.toFixed(2) || '-'}</div> 
</div> 
<div className="bg-white p-3 rounded shadow-sm"> 
<div className="text-sm text-gray-500">Avg Path Length</div> 
<div className="text-xl font-medium">{networkData.avgPathLength?.toFixed(1) || '-'}</div> 
</div> 
<div className="bg-white p-3 rounded shadow-sm"> 
<div className="text-sm text-gray-500">Clustering Coefficient</div> 
<div className="text-xl font-medium">{networkData.clusterCoefficient?.toFixed(2) || '-'}</div> 
</div> 
<div className="bg-white p-3 rounded shadow-sm"> 
<div className="text-sm text-gray-500">Central Teams</div> 
<div className="text-sm font-medium"> 
{networkData.centralTeams?.slice(0, 2).join(', ') || '-'} 
</div> 
</div> 
</div> 
</div> 

{/* Insights Panel */} 
{insights && ( 
<div className="bg-green-50 rounded p-4 border border-green-100"> 
<h4 className="font-medium text-green-800 mb-2">AI Insights</h4> 
<p className="text-green-800">{insights}</p> 

{insights.includes("trained model") && ( 
<div className="mt-3 pt-3 border-t border-green-200"> 
<p className="text-sm text-green-700 italic"> 
This simulation is using a trained machine learning model. The results incorporate patterns learned from actual organizational data, providing more accurate and data-driven predictions. 
</p> 
</div> 
)} 
</div> 
)} 
</div> 
)} 
</Card> 
); 
}; 

export default SimulationResults;
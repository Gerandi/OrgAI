import React, { useState } from 'react'; 
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'; 
import { Download, Info, TrendingUp, Lightbulb, Network } from 'lucide-react'; 
import Card from '../ui/Card'; 
import Button from '../ui/Button'; 

const SimulationResults = ({ 
  data = [], 
  networkData = {}, 
  interventions = [], 
  insights = '', 
  exportSimulation, 
  className = '' 
}) => { 
  const [activeTab, setActiveTab] = useState('performance');
  
  // Chart color palette 
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']; 

  // Format for the tooltip 
  const valueFormatter = (value) => `${parseFloat(value).toFixed(1)}`; 

  // Mark months with interventions 
  const markedMonths = interventions.map(i => i.month); 

  // Prepare data for innovation vs satisfaction chart
  const prepareScatterData = () => {
    return data.map(item => ({
      name: `Month ${item.month}`,
      innovation: item.innovation,
      satisfaction: item.satisfaction,
      performance: item.performance,
    }));
  };

  // Calculate trends for metrics
  const calculateTrends = () => {
    if (data.length < 2) return { performance: 0, innovation: 0, satisfaction: 0 };
    
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    
    return {
      performance: last.performance - prev.performance,
      innovation: last.innovation - prev.innovation,
      satisfaction: last.satisfaction - prev.satisfaction,
    };
  };

  const trends = calculateTrends();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'performance':
        return (
          <>
            {/* Performance Chart */} 
            <div className="mb-6"> 
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

            {/* Current Metrics */}
            {data.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg border ${trends.performance > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Performance</span>
                    <span className={`text-sm font-medium flex items-center ${trends.performance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp size={14} className="mr-1" /> {trends.performance > 0 ? '+' : ''}{trends.performance.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{data[data.length - 1].performance.toFixed(1)}</div>
                </div>
                
                <div className={`p-4 rounded-lg border ${trends.innovation > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Innovation</span>
                    <span className={`text-sm font-medium flex items-center ${trends.innovation > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp size={14} className="mr-1" /> {trends.innovation > 0 ? '+' : ''}{trends.innovation.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{data[data.length - 1].innovation.toFixed(1)}</div>
                </div>
                
                <div className={`p-4 rounded-lg border ${trends.satisfaction > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Satisfaction</span>
                    <span className={`text-sm font-medium flex items-center ${trends.satisfaction > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <TrendingUp size={14} className="mr-1" /> {trends.satisfaction > 0 ? '+' : ''}{trends.satisfaction.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-2xl font-bold mt-1">{data[data.length - 1].satisfaction.toFixed(1)}</div>
                </div>
              </div>
            )}
            
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
          </>
        );
        
      case 'network':
        return (
          <div>
            {/* Network Metrics */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Organizational Network Analysis</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded shadow-sm border">
                  <div className="text-sm text-gray-500">Communication Density</div>
                  <div className="text-xl font-medium">{networkData.density?.toFixed(2) || '-'}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {networkData.density > 0.7 ? 'High communication flow' : 
                     networkData.density > 0.4 ? 'Moderate communication' : 'Limited communication'}
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded shadow-sm border">
                  <div className="text-sm text-gray-500">Avg Path Length</div>
                  <div className="text-xl font-medium">{networkData.avgPathLength?.toFixed(1) || '-'}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {networkData.avgPathLength < 2.5 ? 'Efficient connections' : 
                     networkData.avgPathLength < 3.5 ? 'Average distances' : 'Distant connections'}
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded shadow-sm border">
                  <div className="text-sm text-gray-500">Clustering Coefficient</div>
                  <div className="text-xl font-medium">{networkData.clusterCoefficient?.toFixed(2) || '-'}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {networkData.clusterCoefficient > 0.7 ? 'Strong team cohesion' : 
                     networkData.clusterCoefficient > 0.5 ? 'Moderate clustering' : 'Weak team cohesion'}
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded shadow-sm border">
                  <div className="text-sm text-gray-500">Central Teams</div>
                  <div className="text-sm font-medium">
                    {networkData.centralTeams?.slice(0, 2).join(', ') || '-'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Teams with highest centrality
                  </div>
                </div>
              </div>
            </div>
            
            {/* Network Visualization Placeholder */}
            <div className="bg-blue-50 p-4 border border-blue-100 rounded-lg mb-6">
              <div className="flex items-center mb-2">
                <Network size={18} className="text-blue-500 mr-2" />
                <h4 className="font-medium text-blue-700">Network Structure</h4>
              </div>
              <p className="text-blue-600 text-sm mb-3">
                This visualization shows how teams and departments are connected in your organization.
                Stronger connections indicate more frequent communication.
              </p>
              
              <div className="bg-white border border-blue-100 rounded-lg h-64 flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <Network size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>Use the Community Detection tools below for detailed network analysis</p>
                </div>
              </div>
            </div>
            
            {/* Network Insights */}
            <div className="bg-indigo-50 p-4 border border-indigo-100 rounded-lg">
              <div className="flex items-center mb-2">
                <Lightbulb size={18} className="text-indigo-500 mr-2" />
                <h4 className="font-medium text-indigo-700">Network Insights</h4>
              </div>
              <ul className="list-disc list-inside text-indigo-600">
                <li>
                  {networkData.density > 0.6 ? 
                    'High communication density indicates good information flow, but may lead to information overload.' : 
                    'Moderate to low communication density suggests opportunities for improving cross-team collaboration.'}
                </li>
                <li>
                  {networkData.clusterCoefficient > 0.7 ? 
                    'Teams show strong internal cohesion, which is good for team identity but may create siloes.' : 
                    'Moderate clustering suggests a balance between team identity and cross-functional work.'}
                </li>
                <li>
                  {networkData.centralTeams?.length > 0 ?
                    `The ${networkData.centralTeams.join(' and ')} teams are central to communication flow.` :
                    'No single team dominates communication flow.'}
                </li>
              </ul>
            </div>
          </div>
        );
        
      case 'insights':
        return (
          <div>
            {/* AI Insights */}
            <div className="bg-green-50 rounded p-4 border border-green-100 mb-6">
              <div className="flex items-start">
                <Lightbulb size={20} className="text-green-600 mr-3 mt-1" />
                <div>
                  <h4 className="font-medium text-green-800 mb-2">AI-Generated Insights</h4>
                  <p className="text-green-800">{insights}</p>
                </div>
              </div>
            </div>
            
            {/* Innovation vs Satisfaction Scatter Plot */}
            <h4 className="font-medium mb-2">Innovation vs Satisfaction Analysis</h4>
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prepareScatterData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="innovation" 
                    type="number" 
                    name="Innovation" 
                    domain={[0, 100]}
                    label={{ value: 'Innovation', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    dataKey="satisfaction" 
                    type="number" 
                    name="Satisfaction"
                    domain={[0, 100]}
                    label={{ value: 'Satisfaction', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip formatter={(value) => value.toFixed(1)} />
                  <Line dataKey="satisfaction" stroke="#FFBB28" dot={{ stroke: '#FFBB28', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Intervention Impact Chart */}
            {interventions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Intervention Impact Analysis</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={interventions.map(int => {
                        // Find simulation data for the month after intervention
                        const nextMonth = data.find(d => d.month === int.month + 1);
                        const currentMonth = data.find(d => d.month === int.month);
                        
                        let perfChange = 0;
                        let innChange = 0;
                        let satChange = 0;
                        
                        if (nextMonth && currentMonth) {
                          perfChange = nextMonth.performance - currentMonth.performance;
                          innChange = nextMonth.innovation - currentMonth.innovation;
                          satChange = nextMonth.satisfaction - currentMonth.satisfaction;
                        }
                        
                        return {
                          name: int.name || int.type,
                          month: int.month,
                          performanceChange: perfChange,
                          innovationChange: innChange,
                          satisfactionChange: satChange
                        };
                      })}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Metric Change', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => value.toFixed(1)} />
                      <Legend />
                      <Bar dataKey="performanceChange" name="Performance Impact" fill="#0088FE" />
                      <Bar dataKey="innovationChange" name="Innovation Impact" fill="#00C49F" />
                      <Bar dataKey="satisfactionChange" name="Satisfaction Impact" fill="#FFBB28" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

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
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'performance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance Metrics
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'network' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('network')}
            >
              Network Analysis
            </button>
            <button
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'insights' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('insights')}
            >
              AI Insights
            </button>
          </div>
          
          {/* Tab Content */}
          {renderTabContent()}
        </div> 
      )} 
    </Card> 
  ); 
}; 

export default SimulationResults;
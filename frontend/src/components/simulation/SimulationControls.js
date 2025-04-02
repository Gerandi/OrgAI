import React, { useState } from 'react'; 
import { PlayCircle, PauseCircle, Save, PlusCircle, Plus, Trash2, Settings } from 'lucide-react'; 
import Card from '../ui/Card'; 
import Button from '../ui/Button'; 

const SimulationControls = ({ 
isRunning, 
toggleSimulation, 
simParams, 
updateParameter, 
interventions = [], 
addIntervention, 
updateIntervention, 
removeIntervention, 
loading, 
availableModels = [], 
className = '' 
}) => { 
const [showInterventionForm, setShowInterventionForm] = useState(false); 
const [newIntervention, setNewIntervention] = useState({ 
name: '', 
type: 'communication', 
month: 3, 
intensity: 50, 
target: 'all' 
}); 

const handleAddIntervention = () => { 
addIntervention({ 
id: Date.now().toString(), 
...newIntervention 
}); 
// Reset form 
setNewIntervention({ 
name: '', 
type: 'communication', 
month: 3, 
intensity: 50, 
target: 'all' 
}); 
setShowInterventionForm(false); 
}; 

return ( 
<Card 
className={className} 
title={ 
<div className="flex justify-between items-center"> 
<h3 className="text-lg font-semibold">Simulation Parameters</h3> 
<div className="flex space-x-1"> 
<button 
className={`p-1 rounded-full ${isRunning ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`} 
onClick={toggleSimulation} 
disabled={loading} 
> 
{isRunning ? <PauseCircle size={20} /> : <PlayCircle size={20} />} 
</button> 
<button className="p-1 rounded-full bg-blue-100 text-blue-600"> 
<Settings size={20} /> 
</button> 
</div> 
</div> 
} 
> 
<div className="space-y-4"> 
<div> 
<label className="block text-sm text-gray-600 mb-1">Team Size</label> 
<input 
type="range" 
min="3" 
max="15" 
value={simParams.teamSize} 
onChange={(e) => updateParameter('teamSize', parseInt(e.target.value))} 
className="w-full" 
/> 
<div className="flex justify-between text-xs text-gray-500"> 
<span>3</span> 
<span>{simParams.teamSize}</span> 
<span>15</span> 
</div> 
</div> 

<div> 
<label className="block text-sm text-gray-600 mb-1">Hierarchy Levels</label> 
<input 
type="range" 
min="2" 
max="5" 
value={simParams.hierarchyLevels} 
onChange={(e) => updateParameter('hierarchyLevels', parseInt(e.target.value))} 
className="w-full" 
/> 
<div className="flex justify-between text-xs text-gray-500"> 
<span>2</span> 
<span>{simParams.hierarchyLevels}</span> 
<span>5</span> 
</div> 
</div> 

<div> 
<label className="block text-sm text-gray-600 mb-1">Communication Density</label> 
<input 
type="range" 
min="0.2" 
max="1" 
step="0.1" 
value={simParams.communicationDensity} 
onChange={(e) => updateParameter('communicationDensity', parseFloat(e.target.value))} 
className="w-full" 
/> 
<div className="flex justify-between text-xs text-gray-500"> 
<span>0.2</span> 
<span>{simParams.communicationDensity}</span> 
<span>1.0</span> 
</div> 
</div> 

<div> 
<label className="block text-sm text-gray-600 mb-1">Employee Turnover (%)</label> 
<input 
type="range" 
min="0" 
max="20" 
value={simParams.turnoverRate} 
onChange={(e) => updateParameter('turnoverRate', parseInt(e.target.value))} 
className="w-full" 
/> 
<div className="flex justify-between text-xs text-gray-500"> 
<span>0%</span> 
<span>{simParams.turnoverRate}%</span> 
<span>20%</span> 
</div> 
</div> 

<div> 
<label className="block text-sm text-gray-600 mb-1">Training Frequency</label> 
<select 
value={simParams.trainingFrequency} 
onChange={(e) => updateParameter('trainingFrequency', e.target.value)} 
className="w-full p-2 border rounded" 
> 
<option value="Monthly">Monthly</option> 
<option value="Quarterly">Quarterly</option> 
<option value="Bi-Annually">Bi-Annually</option> 
<option value="Annually">Annually</option> 
</select> 
</div> 

<div> 
<label className="block text-sm text-gray-600 mb-1">Predictive Model</label> 
<select 
value={simParams.model_id || ""} 
onChange={(e) => updateParameter('model_id', e.target.value || null)} 
className="w-full p-2 border rounded" 
> 
<option value="">None (Use Default Simulation)</option> 
{availableModels && availableModels.map(model => ( 
<option key={model.id} value={model.id}> 
{model.name} ({model.r2_score ? (model.r2_score * 100).toFixed(2) + '% accuracy' : 'Unknown accuracy'}) 
</option> 
))} 
</select> 
<p className="text-xs text-gray-500 mt-1">Use trained model for more accurate simulation results</p> 
</div> 

<div className="pt-4 border-t"> 
<div className="flex justify-between items-center mb-3"> 
<h4 className="font-medium">Interventions</h4> 
<Button 
variant="outline" 
size="sm" 
icon={<PlusCircle size={16} />} 
onClick={() => setShowInterventionForm(true)} 
> 
Add 
</Button> 
</div> 

{/* Existing interventions */} 
<div className="space-y-2"> 
{interventions.map(intervention => ( 
<div key={intervention.id} className="bg-gray-50 p-2 rounded border border-gray-200"> 
<div className="flex justify-between items-start"> 
<div> 
<h5 className="font-medium text-sm">{intervention.name}</h5> 
<p className="text-xs text-gray-600"> 
{intervention.type.charAt(0).toUpperCase() + intervention.type.slice(1)} intervention, 
Month {intervention.month}, 
Intensity: {intervention.intensity}% 
</p> 
</div> 
<button 
className="text-red-500 p-1 hover:bg-red-50 rounded" 
onClick={() => removeIntervention(intervention.id)} 
> 
<Trash2 size={14} /> 
</button> 
</div> 
</div> 
))} 
</div> 

{/* New intervention form */} 
{showInterventionForm && ( 
<div className="mt-3 p-3 border rounded bg-blue-50 border-blue-200"> 
<h5 className="font-medium text-sm mb-2">New Intervention</h5> 
<div className="space-y-2"> 
<div> 
<label className="block text-xs text-gray-700">Name</label> 
<input 
type="text" 
className="w-full p-1 text-sm border rounded" 
value={newIntervention.name} 
onChange={(e) => setNewIntervention({...newIntervention, name: e.target.value})} 
placeholder="Communication Training" 
/> 
</div> 

<div> 
<label className="block text-xs text-gray-700">Type</label> 
<select 
className="w-full p-1 text-sm border rounded" 
value={newIntervention.type} 
onChange={(e) => setNewIntervention({...newIntervention, type: e.target.value})} 
> 
<option value="communication">Communication</option> 
<option value="training">Training</option> 
<option value="reorganization">Reorganization</option> 
<option value="leadership">Leadership</option> 
</select> 
</div> 

<div> 
<label className="block text-xs text-gray-700">Month</label> 
<input 
type="range" 
min="1" 
max="12" 
className="w-full" 
value={newIntervention.month} 
onChange={(e) => setNewIntervention({...newIntervention, month: parseInt(e.target.value)})} 
/> 
<div className="flex justify-between text-xs text-gray-500"> 
<span>1</span> 
<span>{newIntervention.month}</span> 
<span>12</span> 
</div> 
</div> 

<div> 
<label className="block text-xs text-gray-700">Intensity</label> 
<input 
type="range" 
min="10" 
max="100" 
step="10" 
className="w-full" 
value={newIntervention.intensity} 
onChange={(e) => setNewIntervention({...newIntervention, intensity: parseInt(e.target.value)})} 
/> 
<div className="flex justify-between text-xs text-gray-500"> 
<span>10%</span> 
<span>{newIntervention.intensity}%</span> 
<span>100%</span> 
</div> 
</div> 

<div> 
<label className="block text-xs text-gray-700">Target</label> 
<select 
className="w-full p-1 text-sm border rounded" 
value={newIntervention.target} 
onChange={(e) => setNewIntervention({...newIntervention, target: e.target.value})} 
> 
<option value="all">All Employees</option> 
<option value="managers">Managers Only</option> 
<option value="teams">Team Level</option> 
</select> 
</div> 

<div className="flex justify-end space-x-2 pt-2"> 
<button 
className="px-2 py-1 text-xs bg-gray-200 rounded" 
onClick={() => setShowInterventionForm(false)} 
> 
Cancel 
</button> 
<button 
className="px-2 py-1 text-xs bg-blue-600 text-white rounded" 
onClick={handleAddIntervention} 
disabled={!newIntervention.name} 
> 
Add Intervention 
</button> 
</div> 
</div> 
</div> 
)} 
</div> 
</div> 
</Card> 
); 
}; 

export default SimulationControls;
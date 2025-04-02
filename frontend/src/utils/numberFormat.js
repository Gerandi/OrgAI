/** 
* Utility functions for consistent number formatting throughout the application 
*/ 

/** 
* Format a number to a consistent format with max 2 decimal places 
* @param {number} value - The number to format 
* @param {boolean} asPercent - Whether to format as percentage (adds % sign) 
* @returns {string} Formatted number string 
*/ 
export const formatNumber = (value, asPercent = false) => { 
if (value === null || value === undefined) return '-'; 

// Convert to number if it's a string 
const num = typeof value === 'string' ? parseFloat(value) : value; 

// Check if it's a valid number 
if (isNaN(num)) return '-'; 

// Format with max 2 decimal places 
const formatted = Math.round(num * 100) / 100; 

// Remove trailing zeros if it's a whole number 
const result = formatted % 1 === 0 ? formatted.toString() : formatted.toFixed(2); 

return asPercent ? `${result}%` : result; 
}; 

/** 
* Format a decimal as percentage with max 2 decimal places 
* @param {number} value - Decimal value (0-1) 
* @returns {string} Formatted percentage 
*/ 
export const formatPercent = (value) => { 
if (value === null || value === undefined) return '-'; 

// Convert to number if it's a string 
const num = typeof value === 'string' ? parseFloat(value) : value; 

// Check if it's a valid number 
if (isNaN(num)) return '-'; 

// Multiply by 100 for percentage and format with max 2 decimal places 
const percentage = Math.round(num * 10000) / 100; 

// Remove trailing zeros if it's a whole number 
return percentage % 1 === 0 ? `${percentage.toString()}%` : `${percentage.toFixed(2)}%`; 
}; 

/** 
* Normalize simulation data for consistent decimal places 
* @param {Object} data - Simulation data object 
* @returns {Object} Normalized data with consistent decimal places 
*/ 
export const normalizeSimulationData = (data) => { 
if (!data) return data; 

// If it's an array, process each item 
if (Array.isArray(data)) { 
return data.map(item => normalizeSimulationData(item)); 
} 

// If it's an object, process each property 
if (typeof data === 'object' && data !== null) { 
const result = {}; 
for (const [key, value] of Object.entries(data)) { 
// If it's a nested object or array, process recursively 
if (typeof value === 'object' && value !== null) { 
result[key] = normalizeSimulationData(value); 
} 
// If it's a number, format it 
else if (typeof value === 'number') { 
// Check if it's a percentage-like field 
const isPercentField = 
key.includes('percentage') || 
key.includes('ratio') || 
(key === 'density') || 
(key.includes('rate')); 

if (isPercentField && value <= 1) { 
// It's likely a decimal percentage (0-1) 
result[key] = Math.round(value * 100) / 100; 
} else { 
// Regular number 
result[key] = Math.round(value * 100) / 100; 
} 
} else { 
// Not a number, keep as is 
result[key] = value; 
} 
} 
return result; 
} 

// If it's a primitive value, return as is 
return data; 
};
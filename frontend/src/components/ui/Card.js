import React from 'react'; 

const Card = ({ children, className = '', title = null, footer = null, ...props }) => { 
return ( 
<div className={`bg-white rounded-lg shadow overflow-hidden ${className}`} {...props}> 
{title && ( 
<div className="px-4 py-3 border-b border-gray-200"> 
<h3 className="text-lg font-semibold text-gray-900">{title}</h3> 
</div> 
)} 
<div className="p-4"> 
{children} 
</div> 
{footer && ( 
<div className="px-4 py-3 bg-gray-50 border-t border-gray-200"> 
{footer} 
</div> 
)} 
</div> 
); 
}; 

export default Card;
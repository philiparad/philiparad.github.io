/** Editable lesson starters; loading a preset never mutates the catalog. */
const curve=(source,color='#147d92',extra={})=>({source,color,visible:true,...extra});
export const GRAPH_EXAMPLES=[
 {id:'linear',title:'Linear functions',description:'Compare slopes and intercepts: y = x and y = -2*x + 3.',range:[-5,6,5,-6],series:[curve('x'),curve('-2*x+3','#c44861')]},
 {id:'quadratic',title:'Quadratic transformations',description:'Compare y = x² with a shifted parabola.',range:[-5,10,5,-3],series:[curve('x^2'),curve('(x-2)^2-1','#c44861')]},
 {id:'cubic',title:'Cubic function',description:'Explore intercepts and turning points of y = x³ - 3x.',range:[-3,6,3,-6],series:[curve('x^3-3*x')]},
 {id:'absolute',title:'Absolute value',description:'Compare y = |x| and y = |x - 2| - 1.',range:[-5,6,5,-3],series:[curve('abs(x)'),curve('abs(x-2)-1','#c44861')]},
 {id:'trigonometry',title:'Sine and cosine',description:'Compare sine and cosine over two periods; angles are in radians.',range:[-2*Math.PI,2,2*Math.PI,-2],series:[curve('sin(x)'),curve('cos(x)','#c44861')]},
 {id:'parameter',title:'Adjustable parabola',description:'Change or animate a to explore y = a*x².',range:[-5,10,5,-10],parameters:[{name:'a',value:1,min:-3,max:3}],series:[curve('a*x^2')]},
 {id:'ellipse',title:'Parametric ellipse',description:'Trace x(t) = 3 cos(t), y(t) = 2 sin(t), for 0 ≤ t ≤ 2π.',range:[-4,3,4,-3],series:[curve('2*sin(t)','#147d92',{kind:'parametric',xSource:'3*cos(t)',tmin:0,tmax:2*Math.PI})]},
 {id:'rose',title:'Polar rose',description:'Explore the three petals of r(t) = 3 cos(3t).',range:[-4,4,4,-4],series:[curve('3*cos(3*t)','#7c50b0',{kind:'polar',tmin:0,tmax:2*Math.PI})]}
];
export function graphExample(id){const example=GRAPH_EXAMPLES.find(x=>x.id===id);if(!example)throw new Error('Choose a graph example.');return structuredClone({...example,parameters:example.parameters||[]});}

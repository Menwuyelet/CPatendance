import{g as O,f as R,r as q,h as M,H as T,j as b,i as N,a4 as n,k as w,s as d,m,a5 as f,n as $,o as x,l as t}from"./index-BP5Vxo6S.js";function z(e){return O("MuiLinearProgress",e)}R("MuiLinearProgress",["root","colorPrimary","colorSecondary","determinate","indeterminate","buffer","query","dashed","dashedColorPrimary","dashedColorSecondary","bar","bar1","bar2","barColorPrimary","barColorSecondary","bar1Indeterminate","bar1Determinate","bar1Buffer","bar2Indeterminate","bar2Buffer"]);const y=4,h=x`
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
`,D=typeof h!="string"?$`
        animation: ${h} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
      `:null,C=x`
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
`,U=typeof C!="string"?$`
        animation: ${C} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
      `:null,P=x`
  0% {
    opacity: 1;
    background-position: 0 -23px;
  }

  60% {
    opacity: 0;
    background-position: 0 -23px;
  }

  100% {
    opacity: 1;
    background-position: -200px -23px;
  }
`,A=typeof P!="string"?$`
        animation: ${P} 3s infinite linear;
      `:null,S=e=>{const{classes:r,variant:a,color:o}=e,g={root:["root",`color${n(o)}`,a],dashed:["dashed",`dashedColor${n(o)}`],bar1:["bar","bar1",`barColor${n(o)}`,(a==="indeterminate"||a==="query")&&"bar1Indeterminate",a==="determinate"&&"bar1Determinate",a==="buffer"&&"bar1Buffer"],bar2:["bar","bar2",a!=="buffer"&&`barColor${n(o)}`,a==="buffer"&&`color${n(o)}`,(a==="indeterminate"||a==="query")&&"bar2Indeterminate",a==="buffer"&&"bar2Buffer"]};return w(g,z,r)},k=(e,r)=>e.vars?e.vars.palette.LinearProgress[`${r}Bg`]:e.palette.mode==="light"?e.lighten(e.palette[r].main,.62):e.darken(e.palette[r].main,.5),K=d("span",{name:"MuiLinearProgress",slot:"Root",overridesResolver:(e,r)=>{const{ownerState:a}=e;return[r.root,r[`color${n(a.color)}`],r[a.variant]]}})(m(({theme:e})=>({position:"relative",overflow:"hidden",display:"block",height:4,zIndex:0,"@media print":{colorAdjust:"exact"},variants:[...Object.entries(e.palette).filter(f()).map(([r])=>({props:{color:r},style:{backgroundColor:k(e,r)}})),{props:({ownerState:r})=>r.color==="inherit"&&r.variant!=="buffer",style:{"&::before":{content:'""',position:"absolute",left:0,top:0,right:0,bottom:0,backgroundColor:"currentColor",opacity:.3}}},{props:{variant:"buffer"},style:{backgroundColor:"transparent"}},{props:{variant:"query"},style:{transform:"rotate(180deg)"}}]}))),E=d("span",{name:"MuiLinearProgress",slot:"Dashed",overridesResolver:(e,r)=>{const{ownerState:a}=e;return[r.dashed,r[`dashedColor${n(a.color)}`]]}})(m(({theme:e})=>({position:"absolute",marginTop:0,height:"100%",width:"100%",backgroundSize:"10px 10px",backgroundPosition:"0 -23px",variants:[{props:{color:"inherit"},style:{opacity:.3,backgroundImage:"radial-gradient(currentColor 0%, currentColor 16%, transparent 42%)"}},...Object.entries(e.palette).filter(f()).map(([r])=>{const a=k(e,r);return{props:{color:r},style:{backgroundImage:`radial-gradient(${a} 0%, ${a} 16%, transparent 42%)`}}})]})),A||{animation:`${P} 3s infinite linear`}),X=d("span",{name:"MuiLinearProgress",slot:"Bar1",overridesResolver:(e,r)=>{const{ownerState:a}=e;return[r.bar,r.bar1,r[`barColor${n(a.color)}`],(a.variant==="indeterminate"||a.variant==="query")&&r.bar1Indeterminate,a.variant==="determinate"&&r.bar1Determinate,a.variant==="buffer"&&r.bar1Buffer]}})(m(({theme:e})=>({width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left",variants:[{props:{color:"inherit"},style:{backgroundColor:"currentColor"}},...Object.entries(e.palette).filter(f()).map(([r])=>({props:{color:r},style:{backgroundColor:(e.vars||e).palette[r].main}})),{props:{variant:"determinate"},style:{transition:`transform .${y}s linear`}},{props:{variant:"buffer"},style:{zIndex:1,transition:`transform .${y}s linear`}},{props:({ownerState:r})=>r.variant==="indeterminate"||r.variant==="query",style:{width:"auto"}},{props:({ownerState:r})=>r.variant==="indeterminate"||r.variant==="query",style:D||{animation:`${h} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite`}}]}))),Y=d("span",{name:"MuiLinearProgress",slot:"Bar2",overridesResolver:(e,r)=>{const{ownerState:a}=e;return[r.bar,r.bar2,r[`barColor${n(a.color)}`],(a.variant==="indeterminate"||a.variant==="query")&&r.bar2Indeterminate,a.variant==="buffer"&&r.bar2Buffer]}})(m(({theme:e})=>({width:"100%",position:"absolute",left:0,bottom:0,top:0,transition:"transform 0.2s linear",transformOrigin:"left",variants:[...Object.entries(e.palette).filter(f()).map(([r])=>({props:{color:r},style:{"--LinearProgressBar2-barColor":(e.vars||e).palette[r].main}})),{props:({ownerState:r})=>r.variant!=="buffer"&&r.color!=="inherit",style:{backgroundColor:"var(--LinearProgressBar2-barColor, currentColor)"}},{props:({ownerState:r})=>r.variant!=="buffer"&&r.color==="inherit",style:{backgroundColor:"currentColor"}},{props:{color:"inherit"},style:{opacity:.3}},...Object.entries(e.palette).filter(f()).map(([r])=>({props:{color:r,variant:"buffer"},style:{backgroundColor:k(e,r),transition:`transform .${y}s linear`}})),{props:({ownerState:r})=>r.variant==="indeterminate"||r.variant==="query",style:{width:"auto"}},{props:({ownerState:r})=>r.variant==="indeterminate"||r.variant==="query",style:U||{animation:`${C} 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite`}}]}))),F=q.forwardRef(function(r,a){const o=M({props:r,name:"MuiLinearProgress"}),{className:g,color:j="primary",value:v,valueBuffer:L,variant:s="indeterminate",...I}=o,l={...o,color:j,variant:s},u=S(l),B=T(),p={},c={bar1:{},bar2:{}};if(s==="determinate"||s==="buffer")if(v!==void 0){p["aria-valuenow"]=Math.round(v),p["aria-valuemin"]=0,p["aria-valuemax"]=100;let i=v-100;B&&(i=-i),c.bar1.transform=`translateX(${i}%)`}else console.error("MUI: You need to provide a value prop when using the determinate or buffer variant of LinearProgress .");if(s==="buffer")if(L!==void 0){let i=(L||0)-100;B&&(i=-i),c.bar2.transform=`translateX(${i}%)`}else console.error("MUI: You need to provide a valueBuffer prop when using the buffer variant of LinearProgress.");return b.jsxs(K,{className:N(u.root,g),ownerState:l,role:"progressbar",...p,ref:a,...I,children:[s==="buffer"?b.jsx(E,{className:u.dashed,ownerState:l}):null,b.jsx(X,{className:u.bar1,ownerState:l,style:c.bar1}),s==="determinate"?null:b.jsx(Y,{className:u.bar2,ownerState:l,style:c.bar2})]})});F.propTypes={classes:t.object,className:t.string,color:t.oneOfType([t.oneOf(["inherit","primary","secondary"]),t.string]),sx:t.oneOfType([t.arrayOf(t.oneOfType([t.func,t.object,t.bool])),t.func,t.object]),value:t.number,valueBuffer:t.number,variant:t.oneOf(["buffer","determinate","indeterminate","query"])};export{F as L};

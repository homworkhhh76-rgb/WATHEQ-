(function(root){'use strict';
function resolve(units,enabled=false,percent=20){
 const rate=Number(percent);if(!Number.isFinite(rate)||rate<0||rate>1000)throw Error('نسبة الربح غير صالحة');
 const out=units.map(u=>({...u}));if(out.some(u=>!Number.isSafeInteger(u.factor)||u.factor<=0))throw Error('معامل الوحدة يجب أن يكون موجباً');
 for(const key of ['buyPrice','price']){const source=out.filter(u=>u[key]!==null&&u[key]!==undefined).sort((a,b)=>b.factor-a.factor)[0];if(source)for(const u of out)if(u[key]==null)u[key]=Math.round(source[key]*u.factor/source.factor)}
 for(const u of out){u.buyPrice=u.buyPrice??0;if(u.price==null)u.price=enabled?Math.round(u.buyPrice*(1+rate/100)):0;for(const k of ['price','buyPrice'])if(!Number.isSafeInteger(u[k])||u[k]<0)throw Error('السعر غير صالح')}
 return out;
}
root.WatheeqPricing={resolve};if(typeof module!=='undefined')module.exports=root.WatheeqPricing;
})(typeof window!=='undefined'?window:globalThis);

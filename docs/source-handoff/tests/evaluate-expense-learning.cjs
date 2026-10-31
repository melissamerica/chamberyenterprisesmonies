const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),assert=require('node:assert/strict');
const cache=new Map();function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;const module={exports:{}};cache.set(file,module);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const req=name=>{if(name.startsWith('@/')||name.startsWith('.')){const base=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name);return load(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx');}return require(name);};new Function('require','module','exports',code)(req,module,module.exports);return module.exports;}
const {buildExpenseDecision,suggestExpense}=load('lib/expense-learning.ts');
const groups=[['Verve Mobility','Transportation'],['Juniper Table','Meals'],['Parkwell Meter','Parking']];
const history=[];
for(let group=0;group<groups.length;group++)for(let n=1;n<=3;n++){
 const row={key:`history-${group}:${n}`,fileId:`history-${group}`,source:'fictional-evaluation.csv',kind:'expense',title:`${groups[group][0]} ${1000+n}`,date:`2026-09-${String(group*3+n).padStart(2,'0')}`,amount:String(20+group*10+n),category:groups[group][1],detail:'',location:'Denver',tripId:'1',match:'',selected:true,duplicateChoice:'new'};
 history.push(buildExpenseDecision('fictional-executive',row,{...row,category:'Misc.'},'assign','Earlier Denver trip',{},undefined,`2026-09-${String(group*3+n).padStart(2,'0')}T12:00:00.000Z`).decision);
}
const tests=[...groups.map(([vendor,label])=>({vendor:vendor+' 2000',city:'Denver',label})),{vendor:'Unknown Provider',city:'Denver',label:null},{vendor:'Verve Mobility 2001',city:'Boston',label:null}];
const results=tests.map((test,i)=>{
 const row={key:`later:${i}`,fileId:'later',source:'fictional-holdout.csv',kind:'expense',title:test.vendor,date:'2026-10-12',amount:String(50+i),category:'Misc.',detail:'',location:test.city,tripId:'2',match:'',selected:true,duplicateChoice:'new'};
 const at='2026-10-13T12:00:00.000Z',earlier=history.filter(value=>value.recordedAt<at);
 const learned=suggestExpense(row,'fictional-executive',{enabled:true,decisions:earlier,preferences:[]},at);
 const latest=earlier.filter(value=>value.city===test.city).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt))[0];
 return{case:i+1,expected:test.label,learned:learned?.category??null,baseline:latest?.category??null};
});
assert.ok(results.every(row=>row.learned===row.expected));
const summarize=field=>({cases:results.length,suggestions:results.filter(row=>row[field]!==null).length,correctSuggestions:results.filter(row=>row[field]!==null&&row[field]===row.expected).length,incorrectSuggestions:results.filter(row=>row[field]!==null&&row[field]!==row.expected).length,abstentions:results.filter(row=>row[field]===null).length});
console.log(JSON.stringify({dataset:'Small fictional regression fixture; not a production accuracy or efficiency estimate',split:'All September feedback precedes every October holdout; no later outcomes are used as training input',baseline:'Reuse the most recent expense category for the same executive and city',learned:summarize('learned'),baselineResult:summarize('baseline'),results},null,2));

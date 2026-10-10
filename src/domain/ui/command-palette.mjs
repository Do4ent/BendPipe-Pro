export const COMMAND_DEFINITIONS=Object.freeze([
  Object.freeze({id:"move",name_en:"Move",name_ru:"Переместить",aliases:["M","MOVE"]}),
  Object.freeze({id:"copy",name_en:"Copy",name_ru:"Копировать",aliases:["C","COPY"]}),
  Object.freeze({id:"rotate",name_en:"Rotate",name_ru:"Повернуть",aliases:["R","ROTATE"]}),
  Object.freeze({id:"array",name_en:"Array",name_ru:"Массив",aliases:["A","ARRAY"]}),
  Object.freeze({id:"divide",name_en:"Divide StraightRun",name_ru:"Разделить прямой участок",aliases:["D","DIVIDE","SPLIT"]}),
  Object.freeze({id:"length",name_en:"Length",name_ru:"Длина",aliases:["L","LENGTH"]}),
  Object.freeze({id:"angle",name_en:"Angle",name_ru:"Угол",aliases:["G","ANGLE"]}),
  Object.freeze({id:"quickMeasure",name_en:"Quick Measure",name_ru:"Быстрое измерение",aliases:["Q","MEASURE"]}),
  Object.freeze({id:"snapSettings",name_en:"Snap Settings",name_ru:"Настройки привязок",aliases:["S","SNAP"]}),
  Object.freeze({id:"selectionFilter",name_en:"Selection Filter",name_ru:"Фильтр выбора",aliases:["F","FILTER"]}),
  Object.freeze({id:"activeUcs",name_en:"Active UCS",name_ru:"Активная СК",aliases:["U","UCS"]}),
  Object.freeze({id:"history",name_en:"History",name_ru:"История",aliases:["H","HISTORY"]}),
  Object.freeze({id:"properties",name_en:"Properties",name_ru:"Свойства",aliases:["P","PROPERTIES","PROP"]}),
  Object.freeze({id:"repeatLast",name_en:"Repeat Last Command",name_ru:"Повторить последнюю команду",aliases:["REPEAT"]}),
  Object.freeze({id:"recentCommands",name_en:"Recent Commands",name_ru:"Последние команды",aliases:["RECENT"]}),
  Object.freeze({id:"hotkeySettings",name_en:"Hotkey Settings",name_ru:"Горячие клавиши",aliases:["HOTKEYS","SHORTCUTS"]})
]);
const byId=new Map(COMMAND_DEFINITIONS.map(command=>[command.id,command]));
const norm=value=>String(value??"").trim().toLocaleLowerCase("ru-RU");
export function defaultAliasMap(){
  return Object.freeze(Object.fromEntries(COMMAND_DEFINITIONS.map(command=>[command.id,Object.freeze([...command.aliases])])));
}
function normalizeAliases(values){
  return Object.freeze([...new Set((Array.isArray(values)?values:[]).map(value=>String(value??"").trim()).filter(Boolean).map(value=>value.toUpperCase()))]);
}
export function normalizeAliasMap(input={}){
  const defaults=defaultAliasMap(),out={};
  for(const command of COMMAND_DEFINITIONS)out[command.id]=normalizeAliases(input?.[command.id]??defaults[command.id]);
  const conflict=aliasConflict(out);
  if(conflict)throw new Error("Command alias conflict: "+conflict.alias+" — "+conflict.command_ids.join(", "));
  return Object.freeze(out);
}
export function aliasConflict(map={}){
  const used=new Map();
  for(const command of COMMAND_DEFINITIONS){
    for(const alias of normalizeAliases(map?.[command.id]??command.aliases)){
      const key=norm(alias),ids=used.get(key)??[];ids.push(command.id);used.set(key,ids);
    }
  }
  for(const [alias,ids] of used)if(ids.length>1)return Object.freeze({alias,command_ids:Object.freeze(ids)});
  return null;
}
export function setAliases(map,commandId,aliases){
  if(!byId.has(String(commandId)))throw new Error("Unknown command");
  const next={...normalizeAliasMap(map),[String(commandId)]:normalizeAliases(aliases)};
  return normalizeAliasMap(next);
}
export function commandById(id){return byId.get(String(id))??null;}
function score(command,query,aliases){
  const q=norm(query);if(!q)return 1;
  const fields=[
    [command.name_en,120],[command.name_ru,120],
    ...(aliases??[]).map(alias=>[alias,150]),
    [command.id,80]
  ];
  let best=-1;
  for(const [value,weight] of fields){
    const text=norm(value);if(!text)continue;
    if(text===q)best=Math.max(best,weight+100);
    else if(text.startsWith(q))best=Math.max(best,weight+60-Math.min(30,text.length-q.length));
    else{
      const index=text.indexOf(q);
      if(index>=0)best=Math.max(best,weight+30-index);
      else{
        let pos=0,matched=0;
        for(const ch of q){const found=text.indexOf(ch,pos);if(found<0)break;matched++;pos=found+1;}
        if(matched===q.length)best=Math.max(best,weight-Math.max(0,text.length-q.length));
      }
    }
  }
  return best;
}
export function searchCommands(query,{alias_map=defaultAliasMap(),recent_ids=[]}={}){
  const map=normalizeAliasMap(alias_map),recency=new Map((recent_ids??[]).map((id,index)=>[String(id),Math.max(0,30-index)]));
  return Object.freeze(COMMAND_DEFINITIONS.map(command=>{
    const base=score(command,query,map[command.id]);
    return {command,score:base+(recency.get(command.id)??0),aliases:map[command.id]};
  }).filter(item=>item.score>=0).sort((a,b)=>b.score-a.score||a.command.name_en.localeCompare(b.command.name_en)).map(item=>Object.freeze(item)));
}
export function resolveCommand(text,{alias_map=defaultAliasMap()}={}){
  const query=norm(text);if(!query)return null;
  const results=searchCommands(query,{alias_map});
  const exact=results.find(item=>
    norm(item.command.id)===query||norm(item.command.name_en)===query||norm(item.command.name_ru)===query||
    item.aliases.some(alias=>norm(alias)===query)
  );
  return exact?.command??(results.length===1?results[0].command:null);
}
export function pushCommandHistory(history=[],text,{limit=50}={}){
  const value=String(text??"").trim();if(!value)return Object.freeze([...(history??[])]);
  const max=Math.max(1,Math.trunc(Number(limit)||50));
  return Object.freeze([value,...(history??[]).filter(item=>String(item)!==value)].slice(0,max));
}
export function normalizePaletteState(input={}){
  return Object.freeze({
    aliases:normalizeAliasMap(input.aliases??{}),
    history:Object.freeze((Array.isArray(input.history)?input.history:[]).map(String).slice(0,50)),
    recent_ids:Object.freeze((Array.isArray(input.recent_ids)?input.recent_ids:[]).map(String).slice(0,20))
  });
}
export function serializePaletteState(state){return JSON.stringify({version:1,...normalizePaletteState(state)});}
export function parsePaletteState(text){
  if(!text)return normalizePaletteState({});
  try{return normalizePaletteState(JSON.parse(String(text)));}catch{return normalizePaletteState({});}
}

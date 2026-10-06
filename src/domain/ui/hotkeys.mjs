export const HOTKEY_COMMANDS=Object.freeze([
  Object.freeze({id:"move",label:"Move",default_chord:"M",category:"Редактирование"}),
  Object.freeze({id:"copy",label:"Copy",default_chord:"C",category:"Редактирование"}),
  Object.freeze({id:"rotate",label:"Rotate",default_chord:"R",category:"Редактирование"}),
  Object.freeze({id:"array",label:"Array",default_chord:"A",category:"Редактирование"}),
  Object.freeze({id:"divide",label:"Divide StraightRun",default_chord:"D",category:"Редактирование"}),
  Object.freeze({id:"length",label:"Length",default_chord:"L",category:"Геометрия"}),
  Object.freeze({id:"angle",label:"Angle",default_chord:"G",category:"Геометрия"}),
  Object.freeze({id:"quickMeasure",label:"Quick Measure",default_chord:"Q",category:"Измерения"}),
  Object.freeze({id:"snapSettings",label:"Snap settings",default_chord:"S",category:"Настройки"}),
  Object.freeze({id:"selectionFilter",label:"Selection Filter",default_chord:"F",category:"Выбор"}),
  Object.freeze({id:"activeUcs",label:"Active UCS",default_chord:"U",category:"Координаты"}),
  Object.freeze({id:"history",label:"History",default_chord:"H",category:"История"}),
  Object.freeze({id:"properties",label:"Properties",default_chord:"P",category:"Интерфейс"}),
  Object.freeze({id:"cancel",label:"Cancel",default_chord:"Escape",category:"Системные"}),
  Object.freeze({id:"repeatLast",label:"Confirm / Repeat last",default_chord:"Enter",category:"Системные"}),
  Object.freeze({id:"repeatLastAlt",label:"Confirm / Repeat last (alternate)",default_chord:"Space",category:"Системные"})
]);

const byId=new Map(HOTKEY_COMMANDS.map(item=>[item.id,item]));
const MOD_ORDER=["Ctrl","Alt","Shift","Meta"];
function titleCaseModifier(value){
  const key=String(value??"").toLowerCase();
  if(key==="ctrl"||key==="control")return "Ctrl";
  if(key==="alt")return "Alt";
  if(key==="shift")return "Shift";
  if(key==="meta"||key==="cmd"||key==="command")return "Meta";
  return null;
}
export function normalizeKeyName(value){
  const raw=String(value??"").trim();
  if(!raw)return "";
  const lower=raw.toLowerCase();
  if(lower==="esc"||lower==="escape")return "Escape";
  if(lower==="enter"||lower==="return")return "Enter";
  if(lower==="space"||lower==="spacebar"||raw===" ")return "Space";
  if(lower==="delete"||lower==="del")return "Delete";
  if(lower==="backspace")return "Backspace";
  if(lower==="tab")return "Tab";
  if(lower.startsWith("arrow"))return "Arrow"+lower.slice(5,6).toUpperCase()+lower.slice(6);
  if(raw.length===1)return raw.toUpperCase();
  if(/^f\d{1,2}$/i.test(raw))return raw.toUpperCase();
  return raw;
}
export function normalizeChord(value){
  const raw=String(value??"").trim();
  if(!raw)return "";
  if(raw===" ")return "Space";
  const parts=raw.split("+").map(part=>part.trim()).filter(Boolean);
  if(!parts.length)return "";
  const modifiers=new Set();
  let key="";
  for(const part of parts){
    const mod=titleCaseModifier(part);
    if(mod)modifiers.add(mod);
    else{
      if(key)throw new Error("Hotkey chord must contain exactly one non-modifier key");
      key=normalizeKeyName(part);
    }
  }
  if(!key)throw new Error("Hotkey chord requires a key");
  return [...MOD_ORDER.filter(mod=>modifiers.has(mod)),key].join("+");
}
export function eventChord(event){
  const key=normalizeKeyName(event?.key);
  if(!key||["Control","Alt","Shift","Meta"].includes(key))return "";
  const mods=[];
  if(event?.ctrlKey)mods.push("Ctrl");
  if(event?.altKey)mods.push("Alt");
  if(event?.shiftKey&&key.length!==1)mods.push("Shift");
  if(event?.metaKey)mods.push("Meta");
  // For letter keys, Shift only changes case and does not create a separate default chord.
  return normalizeChord([...mods,key].join("+"));
}
export function defaultHotkeyMap(){
  return Object.freeze(Object.fromEntries(HOTKEY_COMMANDS.map(item=>[item.id,item.default_chord])));
}
export function normalizeHotkeyMap(input={}){
  const defaults=defaultHotkeyMap(),out={};
  for(const command of HOTKEY_COMMANDS){
    const raw=Object.prototype.hasOwnProperty.call(input,command.id)?input[command.id]:defaults[command.id];
    out[command.id]=normalizeChord(raw);
  }
  const conflict=hotkeyConflict(out);
  if(conflict)throw new Error("Hotkey conflict: "+conflict.chord+" — "+conflict.command_ids.join(", "));
  return Object.freeze(out);
}
export function hotkeyConflict(map={}){
  const used=new Map();
  for(const command of HOTKEY_COMMANDS){
    const chord=normalizeChord(map?.[command.id]??"");
    if(!chord)continue;
    const list=used.get(chord)??[];
    list.push(command.id);used.set(chord,list);
  }
  for(const [chord,ids] of used)if(ids.length>1)return Object.freeze({chord,command_ids:Object.freeze(ids)});
  return null;
}
export function commandDefinition(id){return byId.get(String(id))??null;}
export function commandForChord(map,chord){
  const normalized=normalizeChord(chord);
  if(!normalized)return null;
  for(const command of HOTKEY_COMMANDS)if(normalizeChord(map?.[command.id]??command.default_chord)===normalized)return command;
  return null;
}
export function matchesCommand(event,map,commandId){
  const def=commandDefinition(commandId);if(!def)return false;
  const chord=eventChord(event);if(!chord)return false;
  return chord===normalizeChord(map?.[def.id]??def.default_chord);
}
export function serializeHotkeyMap(map){return JSON.stringify({version:1,map:normalizeHotkeyMap(map)});}
export function parseHotkeyMap(text){
  if(!text)return normalizeHotkeyMap({});
  try{
    const parsed=JSON.parse(String(text));
    return normalizeHotkeyMap(parsed?.map??parsed??{});
  }catch{
    return normalizeHotkeyMap({});
  }
}
export function setHotkey(map,commandId,chord){
  if(!commandDefinition(commandId))throw new Error("Unknown hotkey command");
  const next={...normalizeHotkeyMap(map),[commandId]:normalizeChord(chord)};
  const conflict=hotkeyConflict(next);
  if(conflict)throw new Error("Hotkey conflict: "+conflict.chord+" — "+conflict.command_ids.join(", "));
  return normalizeHotkeyMap(next);
}
export function shortcutLabel(map,commandId){
  const def=commandDefinition(commandId);if(!def)return "";
  return normalizeChord(map?.[commandId]??def.default_chord);
}

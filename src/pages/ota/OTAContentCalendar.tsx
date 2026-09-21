/**
 * OTAContentCalendar.tsx — ปฏิทินบริหาร Content + To-do Checklist
 * Route: /ota/content-calendar
 *
 * Pillar = ธีม/หัวข้อประจำวันในสัปดาห์ (1 วัน = 1 Pillar)
 *   → ทุก cell ของ column วันนั้นจะมีพื้นสีอ่อน + ชื่อ Pillar จางๆ
 *
 * Task = หัวข้อ Content จริงที่จะโพส (มี Platform checklist)
 *
 * Storage: Supabase → fallback localStorage
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2,
  Check, ChevronDown, ChevronUp, CalendarDays, Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type ColorKey = "blue"|"pink"|"green"|"red"|"yellow"|"orange"|"purple"|"teal"|"indigo"|"gray";

interface CustomPlatform {
  id: string;
  name: string;
  color: ColorKey;
  sort_order?: number;
}

/** Pillar = ธีมประจำวันในสัปดาห์ (ไม่ผูกกับ Platform) */
interface ContentPillar {
  id: string;
  dayOfWeek: number;   // 0=อาทิตย์ … 6=เสาร์
  title: string;
  color: ColorKey;
}

interface ContentTask {
  id: string;
  date: string;
  title: string;
  notes: string;
  platforms: string[];
  postedOn: string[];
  pillarId?: string;
}

// ─── Color palette ────────────────────────────────────────────────────────────
const COLOR_MAP: Record<ColorKey, { bg: string; text: string; dot: string; cellBg: string; cellText: string }> = {
  blue:   { bg:"bg-blue-100",   text:"text-blue-800",   dot:"bg-blue-500",   cellBg:"bg-blue-50/60",   cellText:"text-blue-300"   },
  pink:   { bg:"bg-pink-100",   text:"text-pink-800",   dot:"bg-pink-500",   cellBg:"bg-pink-50/60",   cellText:"text-pink-300"   },
  green:  { bg:"bg-green-100",  text:"text-green-800",  dot:"bg-green-500",  cellBg:"bg-green-50/60",  cellText:"text-green-300"  },
  red:    { bg:"bg-red-100",    text:"text-red-800",    dot:"bg-red-500",    cellBg:"bg-red-50/60",    cellText:"text-red-300"    },
  yellow: { bg:"bg-yellow-100", text:"text-yellow-800", dot:"bg-yellow-500", cellBg:"bg-yellow-50/60", cellText:"text-yellow-300" },
  orange: { bg:"bg-orange-100", text:"text-orange-800", dot:"bg-orange-500", cellBg:"bg-orange-50/60", cellText:"text-orange-300" },
  purple: { bg:"bg-purple-100", text:"text-purple-800", dot:"bg-purple-500", cellBg:"bg-purple-50/60", cellText:"text-purple-300" },
  teal:   { bg:"bg-teal-100",   text:"text-teal-800",   dot:"bg-teal-500",   cellBg:"bg-teal-50/60",   cellText:"text-teal-300"   },
  indigo: { bg:"bg-indigo-100", text:"text-indigo-800", dot:"bg-indigo-500", cellBg:"bg-indigo-50/60", cellText:"text-indigo-300" },
  gray:   { bg:"bg-gray-100",   text:"text-gray-700",   dot:"bg-gray-400",   cellBg:"bg-gray-50/60",   cellText:"text-gray-300"   },
};
const COLOR_KEYS = Object.keys(COLOR_MAP) as ColorKey[];

const DEFAULT_PLATFORMS: CustomPlatform[] = [
  { id:"00000000-0000-0000-0000-000000000001", name:"Facebook",  color:"blue",  sort_order:1 },
  { id:"00000000-0000-0000-0000-000000000002", name:"Instagram", color:"pink",  sort_order:2 },
  { id:"00000000-0000-0000-0000-000000000003", name:"LINE",      color:"green", sort_order:3 },
  { id:"00000000-0000-0000-0000-000000000004", name:"YouTube",   color:"red",   sort_order:4 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAY_NAMES_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัส","ศุกร์","เสาร์"];
const DAY_SHORT    = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const MONTH_TH = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];

function toYMD(y:number,m:number,d:number){ return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmtDateTH(ymd:string){ const d=new Date(ymd+"T00:00:00"); return d.toLocaleDateString("th-TH",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
function monthBounds(y:number,m:number){ return {days:new Date(y,m,0).getDate(),firstDow:new Date(y,m-1,1).getDay()}; }

// ─── localStorage fallback ────────────────────────────────────────────────────
const LS_T  = "ota_content_tasks_v2";
const LS_P  = "ota_content_pillars_v3"; // v3 = no platformId
const LS_PL = "ota_platforms_v1";
function lsLoad<T>(key:string):T[]{ try{return JSON.parse(localStorage.getItem(key)||"[]");}catch{return [];} }
function lsSave(key:string,v:unknown){ localStorage.setItem(key,JSON.stringify(v)); }

// ─── Supabase row mappers ──────────────────────────────────────────────────────
function dbRowToTask(r:Record<string,unknown>):ContentTask{
  return { id:r.id as string, date:r.date as string, title:r.title as string,
           notes:(r.notes as string)??"", platforms:(r.platforms as string[])??[],
           postedOn:(r.posted_on as string[])??[], pillarId:(r.pillar_id as string)??undefined };
}
function dbRowToPillar(r:Record<string,unknown>):ContentPillar{
  return { id:r.id as string, dayOfWeek:r.day_of_week as number,
           title:r.title as string, color:(r.color as ColorKey)??"purple" };
}
function dbRowToPlatform(r:Record<string,unknown>):CustomPlatform{
  return { id:r.id as string, name:r.name as string,
           color:(r.color as ColorKey)??"blue", sort_order:(r.sort_order as number)??0 };
}

// ─── Task helpers ─────────────────────────────────────────────────────────────
function platById(platforms:CustomPlatform[],id:string){ return platforms.find(p=>p.id===id); }
function cfgByPlat(p:CustomPlatform){ return COLOR_MAP[p.color]??COLOR_MAP.blue; }
function taskDone(t:ContentTask){ return t.platforms.length>0&&t.platforms.every(p=>t.postedOn.includes(p)); }
function taskProgress(t:ContentTask){ if(!t.platforms.length)return null; return `${t.postedOn.filter(p=>t.platforms.includes(p)).length}/${t.platforms.length}`; }

// ─── Platform Manager ──────────────────────────────────────────────────────────
function PlatformManager({platforms,onSave}:{platforms:CustomPlatform[];onSave:(p:CustomPlatform[])=>void}){
  const [list,setList]         = useState(platforms);
  const [newName,setNewName]   = useState("");
  const [newColor,setNewColor] = useState<ColorKey>("blue");
  const [editId,setEditId]     = useState<string|null>(null);
  const [editName,setEditName] = useState("");
  const [editColor,setEditColor] = useState<ColorKey>("blue");
  const [saving,setSaving]     = useState(false);

  async function add(){
    if(!newName.trim())return;
    setSaving(true);
    const np:CustomPlatform={id:`plt-${Date.now()}`,name:newName.trim(),color:newColor,sort_order:list.length+1};
    if(SUPABASE_ENABLED&&supabase){
      const{data}=await supabase.from("content_platforms").insert({name:np.name,color:np.color,sort_order:np.sort_order}).select().single();
      if(data)np.id=(data as Record<string,unknown>).id as string;
    }
    const u=[...list,np]; setList(u); onSave(u); setNewName(""); setNewColor("blue"); setSaving(false);
  }
  async function remove(id:string){
    if(SUPABASE_ENABLED&&supabase){await supabase.from("content_platforms").delete().eq("id",id);}
    const u=list.filter(p=>p.id!==id); setList(u); onSave(u);
  }
  function startEdit(p:CustomPlatform){setEditId(p.id);setEditName(p.name);setEditColor(p.color);}
  async function commitEdit(){
    if(!editName.trim()){setEditId(null);return;}
    if(SUPABASE_ENABLED&&supabase){await supabase.from("content_platforms").update({name:editName.trim(),color:editColor}).eq("id",editId!);}
    const u=list.map(p=>p.id===editId?{...p,name:editName.trim(),color:editColor}:p);
    setList(u);onSave(u);setEditId(null);
  }

  return(
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 mb-4">
      <p className="font-semibold text-sm">Platform ที่ใช้โพส</p>
      <div className="space-y-2">
        {list.map(p=>{
          const c=cfgByPlat(p);
          if(editId===p.id)return(
            <div key={p.id} className="flex items-center gap-2">
              <input autoFocus className="flex-1 text-sm border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
                value={editName} onChange={e=>setEditName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter")commitEdit();if(e.key==="Escape")setEditId(null);}}/>
              <div className="flex gap-1 flex-wrap">{COLOR_KEYS.map(ck=>(
                <button key={ck} onClick={()=>setEditColor(ck)}
                  className={cn("w-5 h-5 rounded-full border-2 transition-all",COLOR_MAP[ck].dot,editColor===ck?"border-foreground scale-125":"border-transparent")}/>
              ))}</div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white px-2" onClick={commitEdit}>บันทึก</Button>
            </div>
          );
          return(
            <div key={p.id} className="flex items-center gap-2">
              <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg",c.bg,c.text)}>
                <span className={cn("w-2 h-2 rounded-full",c.dot)}/>{p.name}
              </span>
              <div className="ml-auto flex gap-1">
                <button onClick={()=>startEdit(p)} className="text-muted-foreground hover:text-foreground p-1"><ChevronDown className="w-3.5 h-3.5"/></button>
                <button onClick={()=>remove(p.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5"/></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <p className="text-xs text-muted-foreground font-medium">เพิ่ม Platform ใหม่</p>
        <div className="flex gap-1.5 flex-wrap">{COLOR_KEYS.map(ck=>(
          <button key={ck} onClick={()=>setNewColor(ck)}
            className={cn("w-5 h-5 rounded-full border-2 transition-all",COLOR_MAP[ck].dot,newColor===ck?"border-foreground scale-125":"border-transparent")}/>
        ))}</div>
        <div className="flex gap-2">
          <input className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
            placeholder="ชื่อ Platform เช่น TikTok, Twitter..."
            value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}/>
          <Button size="sm" onClick={add} disabled={!newName.trim()||saving} className="bg-purple-600 hover:bg-purple-700 text-white px-3">
            {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<Plus className="w-4 h-4"/>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pillar Manager (ใหม่ — ไม่มี Platform) ──────────────────────────────────
function PillarManager({pillars,onSave}:{
  pillars:ContentPillar[];
  onSave:(p:ContentPillar[])=>void;
}){
  const [list,setList]     = useState<ContentPillar[]>(pillars);
  const [selDay,setSelDay] = useState(1);
  const [title,setTitle]   = useState("");
  const [color,setColor]   = useState<ColorKey>("purple");

  useEffect(()=>{ setList(pillars); },[pillars]);

  // ดูว่าวันที่เลือกมี Pillar อยู่แล้วไหม
  const existing = list.find(p=>p.dayOfWeek===selDay);

  async function save(){
    if(!title.trim())return;
    // ถ้ามีอยู่แล้ว → update; ถ้าไม่มี → insert
    if(existing){
      // update
      const updated={...existing,title:title.trim(),color};
      if(SUPABASE_ENABLED&&supabase){ await supabase.from("content_pillars").update({title:updated.title,color:updated.color}).eq("id",updated.id); }
      const u=list.map(p=>p.id===existing.id?updated:p); setList(u); onSave(u);
    } else {
      const np:ContentPillar={id:`pillar-${Date.now()}`,dayOfWeek:selDay,title:title.trim(),color};
      if(SUPABASE_ENABLED&&supabase){
        const{data}=await supabase.from("content_pillars").insert({day_of_week:selDay,title:np.title,color:np.color}).select().single();
        if(data)np.id=(data as Record<string,unknown>).id as string;
      }
      const u=[...list,np]; setList(u); onSave(u);
    }
    setTitle("");
  }

  async function remove(id:string){
    if(SUPABASE_ENABLED&&supabase){ await supabase.from("content_pillars").delete().eq("id",id); }
    const u=list.filter(p=>p.id!==id); setList(u); onSave(u);
  }

  // เมื่อเลือกวัน → โหลดค่าเดิมถ้ามี
  function handleDaySelect(dow:number){
    setSelDay(dow);
    const ex=list.find(p=>p.dayOfWeek===dow);
    if(ex){ setTitle(ex.title); setColor(ex.color); }
    else  { setTitle(""); setColor("purple"); }
  }

  return(
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 mb-4">
      <div>
        <p className="font-semibold text-sm">Pillar ประจำสัปดาห์</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          กำหนดธีม/หัวข้อหลักของแต่ละวัน — ปฏิทินจะแสดงสีพื้นและชื่อ Pillar จางๆ ทุก cell ของวันนั้น
        </p>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5 flex-wrap">
        {DAY_NAMES_TH.map((d,i)=>{
          const hasPillar=list.some(p=>p.dayOfWeek===i);
          const pillarColor=list.find(p=>p.dayOfWeek===i)?.color;
          return(
            <button key={i} onClick={()=>handleDaySelect(i)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors relative",
                selDay===i?"bg-purple-600 text-white border-transparent":"border-border text-muted-foreground hover:text-foreground")}>
              {d}
              {hasPillar && selDay!==i &&(
                <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white",
                  pillarColor?COLOR_MAP[pillarColor].dot:"bg-purple-400")}/>
              )}
            </button>
          );
        })}
      </div>

      {/* Current day indicator */}
      <div className={cn("rounded-lg px-3 py-2 text-xs font-medium",
        existing?`${COLOR_MAP[existing.color].bg} ${COLOR_MAP[existing.color].text}`:"bg-muted text-muted-foreground")}>
        {existing
          ? <><span className="opacity-60">ปัจจุบัน: </span>{existing.title}</>
          : `${DAY_NAMES_TH[selDay]} — ยังไม่มี Pillar`}
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">สีพื้น column</p>
        <div className="flex gap-1.5 flex-wrap">{COLOR_KEYS.map(ck=>(
          <button key={ck} onClick={()=>setColor(ck)}
            className={cn("w-6 h-6 rounded-full border-2 transition-all",COLOR_MAP[ck].dot,color===ck?"border-foreground scale-125":"border-transparent")}/>
        ))}</div>
      </div>

      {/* Title + save */}
      <div className="flex gap-2">
        <input className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
          placeholder={`ชื่อ Pillar สำหรับวัน${DAY_NAMES_TH[selDay]}... เช่น Review, Tips, Behind the Scene`}
          value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()}/>
        <Button size="sm" onClick={save} disabled={!title.trim()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 shrink-0">
          {existing?"อัพเดต":"บันทึก"}
        </Button>
      </div>

      {/* List */}
      {list.length>0&&(
        <div className="border-t border-border pt-3 space-y-2">
          {DAY_NAMES_TH.map((d,i)=>{
            const p=list.find(x=>x.dayOfWeek===i);
            if(!p)return null;
            const c=COLOR_MAP[p.color];
            return(
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-14 shrink-0">{d}</span>
                <span className={cn("flex-1 inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg",c.bg,c.text)}>
                  <span className={cn("w-2 h-2 rounded-full shrink-0",c.dot)}/>
                  {p.title}
                </span>
                <button onClick={()=>remove(p.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({task,platforms,onUpdate,onDelete}:{
  task:ContentTask;platforms:CustomPlatform[];
  onUpdate:(t:ContentTask)=>void;onDelete:()=>void;
}){
  const [expanded,setExpanded]   = useState(false);
  const [editTitle,setEditTitle] = useState(false);
  const [title,setTitle]         = useState(task.title);
  const [notes,setNotes]         = useState(task.notes);
  const done=taskDone(task);
  const progress=taskProgress(task);
  const titleRef=useRef<HTMLInputElement>(null);

  function togglePosted(id:string){
    const already=task.postedOn.includes(id);
    onUpdate({...task,postedOn:already?task.postedOn.filter(x=>x!==id):[...task.postedOn,id]});
  }
  function togglePlatform(id:string){
    const has=task.platforms.includes(id);
    const newPlats=has?task.platforms.filter(x=>x!==id):[...task.platforms,id];
    onUpdate({...task,platforms:newPlats,postedOn:task.postedOn.filter(x=>newPlats.includes(x))});
  }
  function commitTitle(){ if(title.trim())onUpdate({...task,title:title.trim()}); else setTitle(task.title); setEditTitle(false); }
  function commitNotes(){ onUpdate({...task,notes}); }
  useEffect(()=>{ if(editTitle)titleRef.current?.focus(); },[editTitle]);

  return(
    <div className={cn("border rounded-xl transition-colors",done?"border-border bg-muted/30":"border-border bg-card")}>
      <div className="flex items-start gap-2 p-3">
        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
          done?"border-green-500 bg-green-500":"border-border")}>
          {done&&<Check className="w-3 h-3 text-white"/>}
        </div>
        <div className="flex-1 min-w-0">
          {editTitle?(
            <input ref={titleRef} className="w-full text-sm font-medium bg-background border border-purple-400 rounded px-2 py-0.5 focus:outline-none"
              value={title} onChange={e=>setTitle(e.target.value)} onBlur={commitTitle}
              onKeyDown={e=>{if(e.key==="Enter")commitTitle();if(e.key==="Escape"){setTitle(task.title);setEditTitle(false);}}}/>
          ):(
            <p className={cn("text-sm font-medium cursor-pointer hover:text-purple-600 truncate",done&&"line-through text-muted-foreground")}
              onClick={()=>setEditTitle(true)}>{task.title}</p>
          )}
          {progress&&<span className="text-[11px] text-muted-foreground">{progress} platform โพสแล้ว</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={()=>setExpanded(v=>!v)} className="text-muted-foreground hover:text-foreground p-0.5">
            {expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      {expanded&&(
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">วางแผนโพสบน</p>
            <div className="flex gap-1.5 flex-wrap">
              {platforms.map(p=>{
                const selected=task.platforms.includes(p.id);
                const c=cfgByPlat(p);
                return(
                  <button key={p.id} onClick={()=>togglePlatform(p.id)}
                    className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-all",
                      selected?`${c.bg} ${c.text} border-transparent`:"border-border text-muted-foreground")}>
                    <span className={cn("w-2 h-2 rounded-full",c.dot)}/>{p.name}
                  </button>
                );
              })}
            </div>
          </div>
          {task.platforms.length>0&&(
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">โพสแล้วบน</p>
              <div className="space-y-1.5">
                {task.platforms.map(pid=>{
                  const plat=platById(platforms,pid);
                  if(!plat)return null;
                  const c=cfgByPlat(plat);
                  const posted=task.postedOn.includes(pid);
                  return(
                    <button key={pid} onClick={()=>togglePosted(pid)}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-all text-left",
                        posted?"bg-green-50 border-green-200 text-green-800":`${c.bg} border-transparent ${c.text} hover:brightness-95`)}>
                      <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        posted?"bg-green-500 border-green-500":"border-current opacity-50")}>
                        {posted&&<Check className="w-3 h-3 text-white"/>}
                      </div>
                      <span className={cn("font-medium flex-1",posted&&"line-through")}>{plat.name}</span>
                      {posted&&<span className="text-xs text-green-600">โพสแล้ว ✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">รายละเอียด / โน้ตเนื้อหา</p>
            <textarea className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
              rows={3} placeholder="ใส่รายละเอียดเนื้อหา, link, hashtag, หรือโน้ตสำหรับทีม..."
              value={notes} onChange={e=>setNotes(e.target.value)} onBlur={commitNotes}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Task Form ────────────────────────────────────────────────────────────
function NewTaskForm({date,pillarTitle,platforms,onAdd,onCancel}:{
  date:string;pillarTitle?:string;platforms:CustomPlatform[];
  onAdd:(t:Omit<ContentTask,"id">)=>void;onCancel:()=>void;
}){
  const [title,setTitle]   = useState(pillarTitle?"":""  );
  const [notes,setNotes]   = useState("");
  const [platIds,setPlatIds] = useState<string[]>([]);

  function toggle(id:string){ setPlatIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]); }
  function submit(){ if(!title.trim())return; onAdd({date,title:title.trim(),notes,platforms:platIds,postedOn:[]}); }

  return(
    <div className="border border-purple-300 rounded-xl p-3 space-y-3 bg-purple-50/30">
      {pillarTitle&&!title&&(
        <button onClick={()=>setTitle(pillarTitle)}
          className="w-full text-left text-xs text-purple-600 hover:text-purple-700 px-2 py-1.5 bg-purple-100/60 rounded-lg">
          💡 ใช้ Pillar: <span className="font-semibold">{pillarTitle}</span> เป็นชื่อ Task
        </button>
      )}
      <input autoFocus className="w-full text-sm font-medium border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-purple-400"
        placeholder="ชื่อหัวข้อ Content..."
        value={title} onChange={e=>setTitle(e.target.value)}
        onKeyDown={e=>{if(e.key==="Enter")submit();if(e.key==="Escape")onCancel();}}/>
      <div>
        <p className="text-[11px] text-muted-foreground mb-1.5">โพสบน Platform:</p>
        <div className="flex gap-1.5 flex-wrap">
          {platforms.map(p=>{
            const c=cfgByPlat(p);
            return(
              <button key={p.id} onClick={()=>toggle(p.id)}
                className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-all",
                  platIds.includes(p.id)?`${c.bg} ${c.text} border-transparent`:"border-border text-muted-foreground")}>
                <span className={cn("w-1.5 h-1.5 rounded-full",c.dot)}/>{p.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!title.trim()} onClick={submit}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="w-3.5 h-3.5 mr-1"/>เพิ่ม Task
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>ยกเลิก</Button>
      </div>
    </div>
  );
}

// ─── Day Panel ────────────────────────────────────────────────────────────────
function DayPanel({ymd,tasks,pillar,platforms,onClose,onAdd,onUpdate,onDelete}:{
  ymd:string;tasks:ContentTask[];pillar:ContentPillar|undefined;platforms:CustomPlatform[];
  onClose:()=>void;
  onAdd:(t:Omit<ContentTask,"id">)=>void;
  onUpdate:(t:ContentTask)=>void;
  onDelete:(id:string)=>void;
}){
  const [adding,setAdding]=useState(false);
  const doneCount=tasks.filter(taskDone).length;
  const pillarCfg=pillar?COLOR_MAP[pillar.color]:null;

  return(
    <div className="flex flex-col h-full">
      <div className={cn("flex items-start justify-between px-4 py-3 border-b border-border shrink-0",
        pillarCfg?`${pillarCfg.bg}`:"")}>
        <div>
          <p className="font-semibold text-sm">{fmtDateTH(ymd)}</p>
          {pillar&&<p className={cn("text-xs font-medium mt-0.5",pillarCfg?.text)}>📌 Pillar: {pillar.title}</p>}
          {tasks.length>0&&<p className="text-xs text-muted-foreground mt-0.5">{doneCount}/{tasks.length} task โพสแล้ว</p>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5"><X className="w-4 h-4"/></button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {tasks.length===0&&!adding&&(
          <div className="text-center py-8">
            <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2"/>
            <p className="text-sm text-muted-foreground">ยังไม่มี Content วันนี้</p>
            {pillar&&<p className="text-xs text-muted-foreground/70 mt-1">Pillar วันนี้: <span className="font-medium">{pillar.title}</span></p>}
          </div>
        )}
        {tasks.map(t=>(
          <TaskCard key={t.id} task={t} platforms={platforms} onUpdate={onUpdate} onDelete={()=>onDelete(t.id)}/>
        ))}
        {adding?(
          <NewTaskForm date={ymd} pillarTitle={pillar?.title} platforms={platforms}
            onAdd={(t)=>{onAdd(t);setAdding(false);}} onCancel={()=>setAdding(false)}/>
        ):(
          <button onClick={()=>setAdding(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-purple-600 hover:text-purple-700 border border-dashed border-purple-300 rounded-xl hover:border-purple-400 transition-colors">
            <Plus className="w-4 h-4"/>เพิ่ม Content Task
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab="pillar"|"platform";

export default function OTAContentCalendar(){
  const today=new Date();
  const [year,setYear]   = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth()+1);

  const [tasks,    setTasks]     = useState<ContentTask[]>([]);
  const [pillars,  setPillars]   = useState<ContentPillar[]>([]);
  const [platforms,setPlatforms] = useState<CustomPlatform[]>(DEFAULT_PLATFORMS);
  const [loading,  setLoading]   = useState(true);

  const [selectedDate,setSelectedDate] = useState<string|null>(null);
  const [settingsTab, setSettingsTab]  = useState<Tab>("pillar");
  const [showSettings,setShowSettings] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadData=useCallback(async()=>{
    setLoading(true);
    if(SUPABASE_ENABLED&&supabase){
      const [plR,piR,tR]=await Promise.all([
        supabase.from("content_platforms").select("*").order("sort_order"),
        supabase.from("content_pillars").select("*").order("day_of_week"),
        supabase.from("content_tasks").select("*").order("date"),
      ]);
      if(plR.data&&plR.data.length>0)setPlatforms((plR.data as Record<string,unknown>[]).map(dbRowToPlatform));
      if(piR.data)setPillars((piR.data as Record<string,unknown>[]).map(dbRowToPillar));
      if(tR.data) setTasks((tR.data as Record<string,unknown>[]).map(dbRowToTask));
    } else {
      const savedPl=lsLoad<CustomPlatform>(LS_PL); if(savedPl.length>0)setPlatforms(savedPl);
      setPillars(lsLoad<ContentPillar>(LS_P));
      setTasks(lsLoad<ContentTask>(LS_T));
    }
    setLoading(false);
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{ if(!SUPABASE_ENABLED){lsSave(LS_PL,platforms);} },[platforms]);
  useEffect(()=>{ if(!SUPABASE_ENABLED){lsSave(LS_P,pillars);} },[pillars]);
  useEffect(()=>{ if(!SUPABASE_ENABLED){lsSave(LS_T,tasks);} },[tasks]);

  const{days,firstDow}=useMemo(()=>monthBounds(year,month),[year,month]);
  const todayYMD=toYMD(today.getFullYear(),today.getMonth()+1,today.getDate());

  function prevMonth(){ if(month===1){setYear(y=>y-1);setMonth(12);}else setMonth(m=>m-1); }
  function nextMonth(){ if(month===12){setYear(y=>y+1);setMonth(1);}else setMonth(m=>m+1); }

  // ── CRUD Tasks ──────────────────────────────────────────────────────────────
  async function addTask(t:Omit<ContentTask,"id">){
    if(SUPABASE_ENABLED&&supabase){
      const{data}=await supabase.from("content_tasks").insert({
        date:t.date,title:t.title,notes:t.notes,platforms:t.platforms,posted_on:t.postedOn,pillar_id:t.pillarId??null,
      }).select().single();
      if(data){setTasks(prev=>[...prev,dbRowToTask(data as Record<string,unknown>)]);return;}
    }
    setTasks(prev=>[...prev,{...t,id:`task-${Date.now()}`}]);
  }
  async function updateTask(t:ContentTask){
    setTasks(prev=>prev.map(x=>x.id===t.id?t:x));
    if(SUPABASE_ENABLED&&supabase){
      await supabase.from("content_tasks").update({
        title:t.title,notes:t.notes,platforms:t.platforms,posted_on:t.postedOn,updated_at:new Date().toISOString(),
      }).eq("id",t.id);
    }
  }
  async function deleteTask(id:string){
    setTasks(prev=>prev.filter(x=>x.id!==id));
    if(SUPABASE_ENABLED&&supabase){await supabase.from("content_tasks").delete().eq("id",id);}
  }

  const trailingEmpties=(firstDow+days)%7===0?0:7-((firstDow+days)%7);
  const selectedTasks=selectedDate?tasks.filter(t=>t.date===selectedDate):[];
  const selectedDow=selectedDate?new Date(selectedDate+"T00:00:00").getDay():null;
  const selectedPillar=selectedDow!=null?pillars.find(p=>p.dayOfWeek===selectedDow):undefined;

  // pillar lookup map by DOW
  const pillarByDow=useMemo(()=>{
    const m:Record<number,ContentPillar>={};
    pillars.forEach(p=>{ m[p.dayOfWeek]=p; });
    return m;
  },[pillars]);

  if(loading)return(
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-purple-600"/>
      <span className="ml-2 text-sm text-muted-foreground">กำลังโหลด Content Calendar...</span>
    </div>
  );

  return(
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">📅 Content Calendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            วางแผนและติดตามการโพส Content รายวัน
            {SUPABASE_ENABLED&&<span className="ml-2 text-green-600">● sync</span>}
          </p>
        </div>
        <button onClick={()=>setShowSettings(v=>!v)}
          className={cn("flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors shrink-0",
            showSettings?"border-purple-400 bg-purple-50 text-purple-700":"border-border text-muted-foreground hover:text-foreground")}>
          <Settings className="w-4 h-4"/><span className="hidden sm:inline">ตั้งค่า</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Calendar */}
        <div className={cn("flex flex-col overflow-hidden transition-all",
          selectedDate?"hidden sm:flex sm:flex-1":"flex-1")}>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">

            {/* Settings panel */}
            {showSettings&&(
              <div className="mb-4">
                <div className="flex border-b border-border mb-4">
                  {(["pillar","platform"] as Tab[]).map(tab=>(
                    <button key={tab} onClick={()=>setSettingsTab(tab)}
                      className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                        settingsTab===tab?"border-purple-600 text-purple-700":"border-transparent text-muted-foreground hover:text-foreground")}>
                      {tab==="pillar"?"Pillar (หัวข้อประจำสัปดาห์)":"Platform"}
                    </button>
                  ))}
                </div>
                {settingsTab==="platform"?(
                  <PlatformManager platforms={platforms} onSave={setPlatforms}/>
                ):(
                  <PillarManager pillars={pillars} onSave={setPillars}/>
                )}
              </div>
            )}

            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5"/></button>
              <span className="font-semibold">{MONTH_TH[month-1]} {year+543}</span>
              <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5"/></button>
            </div>

            {/* Day headers — พร้อม Pillar indicator บน header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_SHORT.map((d,i)=>{
                const pillar=pillarByDow[i];
                const c=pillar?COLOR_MAP[pillar.color]:null;
                return(
                  <div key={d} className={cn("text-center text-xs font-medium py-1.5 rounded-t-lg",
                    i===0||i===6?"text-muted-foreground/60":"text-muted-foreground",
                    c?c.cellBg:"")}>
                    {d}
                    {pillar&&<div className={cn("text-[9px] font-semibold truncate px-1 opacity-70",c?.text)}>{pillar.title}</div>}
                  </div>
                );
              })}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({length:firstDow}).map((_,i)=><div key={`l${i}`}/>)}
              {Array.from({length:days}).map((_,i)=>{
                const d=i+1;
                const dow=(firstDow+i)%7;
                const ymd=toYMD(year,month,d);
                const dayTasks=tasks.filter(t=>t.date===ymd);
                const doneTasks=dayTasks.filter(taskDone).length;
                const isToday=ymd===todayYMD;
                const isSelected=ymd===selectedDate;
                const isWeekend=dow===0||dow===6;
                const allDone=dayTasks.length>0&&doneTasks===dayTasks.length;
                const pillar=pillarByDow[dow];
                const pillarC=pillar?COLOR_MAP[pillar.color]:null;

                return(
                  <div key={ymd} onClick={()=>setSelectedDate(isSelected?null:ymd)}
                    className={cn(
                      "border rounded-xl p-1.5 min-h-[80px] sm:min-h-[90px] cursor-pointer transition-all relative overflow-hidden",
                      isSelected  ?"border-purple-500 ring-2 ring-purple-400 ring-offset-1 bg-purple-50/50":
                      isToday     ?"border-purple-300 ring-1 ring-purple-300 bg-white":
                      pillarC     ?`${pillarC.cellBg} border-border/50 hover:border-border`:
                      isWeekend   ?"bg-muted/20 border-border/40 hover:border-border":
                                   "bg-card border-border hover:border-purple-300"
                    )}>
                    {/* Pillar watermark */}
                    {pillar&&!isSelected&&(
                      <div className="absolute inset-0 flex items-end justify-end pb-1 pr-1.5 pointer-events-none select-none">
                        <span className={cn("text-[9px] font-bold opacity-20 leading-none",pillarC?.text)}>
                          {pillar.title}
                        </span>
                      </div>
                    )}

                    {/* Date + status */}
                    <div className="flex items-center justify-between mb-1 relative z-10">
                      <span className={cn("text-xs font-medium",
                        isToday?"text-purple-600 font-bold":isWeekend?"text-muted-foreground/70":"text-foreground")}>{d}</span>
                      {allDone&&<Check className="w-3 h-3 text-green-500"/>}
                      {dayTasks.length>0&&!allDone&&<span className="text-[9px] text-muted-foreground">{doneTasks}/{dayTasks.length}</span>}
                    </div>

                    {/* Task pills */}
                    <div className="space-y-0.5 overflow-hidden relative z-10">
                      {dayTasks.map(t=>{
                        const done=taskDone(t);
                        const mainPlat=platById(platforms,t.platforms[0]??"");
                        const c=mainPlat?cfgByPlat(mainPlat):null;
                        return(
                          <div key={t.id} className={cn(
                            "text-[10px] font-medium rounded px-1 py-0.5 flex items-center gap-1 min-w-0",
                            done
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                              : c?`${c.bg} ${c.text}`:"bg-white/70 text-muted-foreground")}>
                            {/* ── Inline checkbox — toggle done without opening panel ── */}
                            <button
                              onClick={(e)=>{
                                e.stopPropagation();
                                updateTask({...t, postedOn: done ? [] : [...t.platforms]});
                              }}
                              className={cn(
                                "shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                                done
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-current/30 bg-white/70 hover:border-purple-500 hover:bg-white"
                              )}
                              title={done?"ยกเลิกโพส":"ทำเครื่องหมายโพสแล้ว"}
                            >
                              {done&&<Check className="w-2 h-2 stroke-[3]"/>}
                            </button>
                            <span className={cn("truncate flex-1",done&&"line-through opacity-60")}>{t.title}</span>
                            {t.platforms.length>0&&(
                              <span className={cn("flex gap-0.5 shrink-0",done&&"opacity-50")}>
                                {t.platforms.slice(0,4).map(pid=>{
                                  const pp=platById(platforms,pid); if(!pp)return null;
                                  const pc=cfgByPlat(pp);
                                  return <span key={pid} className={cn("w-2 h-2 rounded-full border border-white/60",pc.dot)}/>;
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {Array.from({length:trailingEmpties}).map((_,i)=><div key={`r${i}`}/>)}
            </div>

            {/* Legend */}
            <div className="mt-4 flex gap-3 flex-wrap items-center">
              {platforms.map(p=>{
                const c=cfgByPlat(p);
                return(<div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("w-2 h-2 rounded-full",c.dot)}/>{p.name}</div>);
              })}
              {pillars.map(p=>{
                const c=COLOR_MAP[p.color];
                return(<div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("w-3 h-3 rounded",c.cellBg,"border",c.dot.replace("bg-","border-"))}/>{p.title}</div>);
              })}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="w-3 h-3 text-green-500"/>โพสครบแล้ว</div>
            </div>
          </div>
        </div>

        {/* Right: Day Panel */}
        {selectedDate&&(
          <div className={cn(
            "flex flex-col border-l border-border bg-background",
            "w-full sm:w-80 md:w-96 shrink-0",
            "fixed inset-0 sm:relative sm:inset-auto z-40 sm:z-auto"
          )}>
            <DayPanel
              ymd={selectedDate} tasks={selectedTasks} pillar={selectedPillar} platforms={platforms}
              onClose={()=>setSelectedDate(null)}
              onAdd={addTask} onUpdate={updateTask} onDelete={deleteTask}
            />
          </div>
        )}
      </div>
    </div>
  );
}

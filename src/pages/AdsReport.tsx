/**
 * AdsReport.tsx — v3 Premium UI
 * Route: /marketing/ads-report
 *
 * ① KPI Cards  — colored accent bar + counter animation + delta %
 * ② Chart zone — Donut (Spend) + Horizontal bar (Messages) via recharts
 * ③ Group cards — left accent bar + progress bar + SVG sparkline
 * ④ Insight cards — sticky-note style (Win/Fix/Plan)
 *
 * Supabase persistence — ทีม Marketing ทุกคนเห็นข้อมูลเดียวกัน
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RechartTooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
} from "recharts";
import {
  Upload, FileText, X, ChevronDown, ChevronRight, ChevronLeft,
  TrendingUp, Eye, Users, MessageCircle, DollarSign,
  MousePointerClick, AlertTriangle, Info, Plus, Trash2,
  GitCompare, Loader2, CloudUpload, Trophy, Wrench, Rocket,
  Save, CheckCircle2, Search, SlidersHorizontal, Zap, Monitor,
} from "lucide-react";
import { supabase, SUPABASE_ENABLED } from "@/lib/supabase";
import { useCurrentUser } from "@/store/authStore";

// ── Group color palette ────────────────────────────────────────────────────────
const GROUP_COLORS = [
  "#7F77DD", "#1D9E75", "#378ADD", "#EF9F27",
  "#D4537E", "#5DCAA5", "#D85A30", "#639922", "#884AB7", "#BA7517",
];
function groupColor(idx: number) { return GROUP_COLORS[idx % GROUP_COLORS.length]; }

// ── Types ─────────────────────────────────────────────────────────────────────
interface ColumnMap {
  name?:number;status?:number;spend?:number;impressions?:number;reach?:number;
  cpm?:number;ctr?:number;cpcLink?:number;cpcAll?:number;messages?:number;
  costPerMsg?:number;pageEngagement?:number;roas?:number;startDate?:number;endDate?:number;
}
interface AdRow {
  name:string;status:string;spend:number|null;impressions:number|null;reach:number|null;
  cpm:number|null;ctr:number|null;cpcLink:number|null;cpcAll:number|null;
  messages:number|null;costPerMsg:number|null;pageEngagement:number|null;
  roas:number|null;startDate:string;endDate:string;group:string;
}
interface ReportMeta {
  id:string;period_label:string;file_name:string;uploaded_at:string;uploaded_by:string|null;
}
interface ReportData extends ReportMeta { ads:AdRow[]; colMap:ColumnMap; }

// ── CSV Parser (RFC 4180) ─────────────────────────────────────────────────────
function parseCSVLine(line:string):string[] {
  const result:string[]=[]; let cur="",inQuote=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(inQuote){if(ch==='"'){if(line[i+1]==='"'){cur+='"';i++;}else inQuote=false;}else cur+=ch;}
    else{if(ch==='"')inQuote=true;else if(ch===','){result.push(cur.trim());cur="";}else cur+=ch;}
  }
  result.push(cur.trim());return result;
}
function parseCSV(text:string):{headers:string[];rows:string[][]}{
  const lines=text.split(/\r?\n/).filter(l=>l.trim()!=="");
  if(!lines.length)return{headers:[],rows:[]};
  return{headers:parseCSVLine(lines[0]),rows:lines.slice(1).map(parseCSVLine)};
}

// ── Column Detector ───────────────────────────────────────────────────────────
const COL_PATTERNS:{key:keyof ColumnMap;keywords:string[]}[]=[
  {key:"name",keywords:["ชื่อโฆษณา"]},{key:"status",keywords:["สถานะ"]},
  {key:"spend",keywords:["จำนวนเงินที่ใช้จ่าย","ใช้จ่าย"]},
  {key:"impressions",keywords:["อิมเพรสชัน"]},{key:"reach",keywords:["การเข้าถึง"]},
  {key:"cpm",keywords:["cpm","ต้นทุนต่ออิมเพรสชั่น"]},{key:"ctr",keywords:["ctr"]},
  {key:"cpcLink",keywords:["cpc (ต้นทุนต่อการคลิกลิงก์)","cpc (ลิงก์)"]},
  {key:"cpcAll",keywords:["cpc (ทั้งหมด)"]},
  {key:"messages",keywords:["ผู้ติดต่อผ่านการส่งข้อความ"]},
  {key:"costPerMsg",keywords:["ต้นทุนต่อการเริ่มการสนทนา"]},
  {key:"pageEngagement",keywords:["การมีส่วนร่วมกับเพจ"]},
  {key:"roas",keywords:["roas"]},
  {key:"startDate",keywords:["เริ่มการรายงาน"]},{key:"endDate",keywords:["สิ้นสุดการรายงาน"]},
];
function detectColumns(headers:string[]):ColumnMap{
  const map:ColumnMap={};const lower=headers.map(h=>h.toLowerCase().trim());
  for(const{key,keywords}of COL_PATTERNS){
    for(let i=0;i<lower.length;i++){
      if(keywords.some(kw=>lower[i].includes(kw.toLowerCase()))){map[key]=i;break;}
    }
  }
  return map;
}

// ── Row Converter ─────────────────────────────────────────────────────────────
function n(val?:string):number|null{
  if(!val||val.trim()===""||val.trim()==="-")return null;
  const num=parseFloat(val.replace(/,/g,""));return isNaN(num)?null:num;
}
function getGroup(name:string):string{return name.split("|")[0].trim()||name;}
function convertRows(rows:string[][],cm:ColumnMap):AdRow[]{
  return rows.filter(r=>r.some(c=>c.trim()!=="")).map(r=>{
    const g=(idx?:number)=>idx!==undefined?r[idx]:undefined;
    const name=g(cm.name)??"";
    return{name,group:getGroup(name),status:g(cm.status)??"",
      spend:n(g(cm.spend)),impressions:n(g(cm.impressions)),reach:n(g(cm.reach)),
      cpm:n(g(cm.cpm)),ctr:n(g(cm.ctr)),cpcLink:n(g(cm.cpcLink)),cpcAll:n(g(cm.cpcAll)),
      messages:n(g(cm.messages)),costPerMsg:n(g(cm.costPerMsg)),
      pageEngagement:n(g(cm.pageEngagement)),roas:n(g(cm.roas)),
      startDate:g(cm.startDate)??"",endDate:g(cm.endDate)??"",
    };
  });
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtB=(v:number|null)=>v===null?"—":v.toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN=(v:number|null,dp=2)=>v===null?"—":v.toLocaleString("th-TH",{minimumFractionDigits:dp,maximumFractionDigits:dp});
const fmtInt=(v:number|null)=>v===null?"—":Math.round(v).toLocaleString("th-TH");
function sumN(rows:AdRow[],key:keyof AdRow):number{
  return rows.reduce((a,r)=>a+(typeof r[key]==="number"?(r[key] as number):0),0);
}
function avgN(rows:AdRow[],key:keyof AdRow):number|null{
  const vals=rows.map(r=>r[key]).filter(v=>typeof v==="number") as number[];
  return vals.length===0?null:vals.reduce((a,b)=>a+b,0)/vals.length;
}

// ── Counter animation hook ────────────────────────────────────────────────────
function useCountUp(target:number,duration=900):number{
  const [count,setCount]=useState(0);
  useEffect(()=>{
    if(target===0){setCount(0);return;}
    let raf:number;const start=performance.now();
    const tick=(now:number)=>{
      const p=Math.min((now-start)/duration,1);
      const ease=1-Math.pow(1-p,3);
      setCount(Math.round(target*ease));
      if(p<1)raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[target,duration]);
  return count;
}

// ── Delta Badge ───────────────────────────────────────────────────────────────
function DeltaBadge({a,b,higherIsBetter=true}:{a:number|null;b:number|null;higherIsBetter?:boolean}){
  if(a===null||b===null||b===0)return null;
  const diffPct=((a-b)/Math.abs(b))*100;
  const good=higherIsBetter?diffPct>=0:diffPct<=0;
  const sign=diffPct>=0?"▲":"▼";
  return(
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${good?"bg-emerald-500/20 text-emerald-400":"bg-red-500/20 text-red-400"}`}>
      {sign}{Math.abs(diffPct).toFixed(1)}%
    </span>
  );
}

// ── Sort / Heatmap / InlineDelta ─────────────────────────────────────────────
type ColSortKey = 'name'|'spend'|'impressions'|'reach'|'cpm'|'ctr'|'messages'|'costPerMsg'|'pageEngagement';

/** Green→Yellow→Red gradient based on relative value within the group */
function heatBg(value:number|null,min:number,max:number,higherIsBetter:boolean,neutral=false):string{
  if(value===null||min===max)return"transparent";
  const pct=(value-min)/(max-min);
  if(neutral)return`rgba(127,119,221,${(0.04+pct*0.18).toFixed(2)})`;
  const p=higherIsBetter?pct:1-pct;
  const g=[29,158,117],y=[239,159,39],r=[239,68,68];
  const mix=(a:number[],b:number[],t:number)=>a.map((v,i)=>Math.round(v+t*(b[i]-v)));
  const rgb=p>=0.5?mix(y,g,(p-0.5)*2):mix(r,y,p*2);
  return`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(0.08+p*0.14).toFixed(2)})`;
}

/** Tiny inline ▲/▼ % badge shown below cell value when compare period is active */
function InlineDelta({a,b,higherIsBetter=true}:{a:number|null;b:number|null;higherIsBetter?:boolean}){
  if(a===null||b===null||b===0)return null;
  const pct=((a-b)/Math.abs(b))*100;
  const good=higherIsBetter?pct>=0:pct<=0;
  return(
    <div className={`text-[9px] font-bold leading-none mt-0.5 tabular-nums ${good?"text-emerald-400":"text-red-400"}`}>
      {pct>=0?"▲":"▼"}{Math.abs(pct).toFixed(1)}%
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({status}:{status:string}){
  const s=status.toLowerCase();
  if(s==="active")return<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Active</span>;
  if(s==="not_delivering")return<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>Paused</span>;
  if(s==="archived")return<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/15 text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-zinc-400"/>Archived</span>;
  return<span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">{status}</span>;
}

// ── ① KPI Card with counter animation ────────────────────────────────────────
interface KPICardProps{
  label:string;numericValue:number|null;prefix?:string;suffix?:string;decimals?:number;
  compareValue?:number|null;icon:React.ReactNode;accentColor:string;available:boolean;
  higherIsBetter?:boolean;
}
function KPICard({label,numericValue,prefix="",suffix="",decimals=0,compareValue,icon,accentColor,available,higherIsBetter=true}:KPICardProps){
  const animated=useCountUp(numericValue??0);
  const display=available
    ?`${prefix}${animated.toLocaleString("th-TH",{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}${suffix}`
    :"ไม่มีข้อมูล";
  return(
    <div className={`rounded-2xl border bg-card flex flex-col overflow-hidden shadow-sm h-full ${!available?"opacity-40":""}`}>
      <div className="px-3.5 pt-3.5 pb-2.5 sm:px-5 sm:pt-5 sm:pb-4 flex flex-col gap-2 sm:gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight pt-0.5">{label}</span>
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0" style={{background:accentColor+"22"}}>
            <span style={{color:accentColor,display:"flex"}}>{icon}</span>
          </div>
        </div>
        <div>
          <p className="text-xl sm:text-3xl font-bold tracking-tight text-foreground leading-none">{display}</p>
          {compareValue!==undefined&&compareValue!==null&&numericValue!==null&&(
            <div className="mt-1">
              <DeltaBadge a={numericValue} b={compareValue} higherIsBetter={higherIsBetter}/>
            </div>
          )}
        </div>
      </div>
      <div className="h-1 w-full" style={{background:accentColor}}/>
    </div>
  );
}

// ── ② Chart Section ───────────────────────────────────────────────────────────
const CHART_LIMIT=6;

function ChartSection({ads,colMap,groupColorMap,onGroupClick,activeGroupFilter}:{ads:AdRow[];colMap:ColumnMap;groupColorMap:Record<string,string>;onGroupClick:(g:string)=>void;activeGroupFilter:string|null}){
  // Donut — spend by group
  const spendData=Object.entries(
    ads.reduce<Record<string,number>>((acc,ad)=>{
      if(ad.spend)acc[ad.group]=(acc[ad.group]??0)+ad.spend;return acc;
    },{})
  ).sort(([,a],[,b])=>b-a);

  const topSpend=spendData.slice(0,CHART_LIMIT);
  const restSpend=spendData.slice(CHART_LIMIT).reduce((s,[,v])=>s+v,0);
  const donutData=[...topSpend,...(restSpend>0?[["อื่นๆ",restSpend] as [string,number]]:[])];
  const totalSpend=donutData.reduce((s,[,v])=>s+v,0);

  // Horizontal bar — messages by group
  const msgData=Object.entries(
    ads.reduce<Record<string,number>>((acc,ad)=>{
      if(ad.messages)acc[ad.group]=(acc[ad.group]??0)+ad.messages;return acc;
    },{})
  ).sort(([,a],[,b])=>b-a).slice(0,CHART_LIMIT).map(([name,value])=>({name:name.length>12?name.slice(0,11)+"…":name,value,full:name}));

  const hasSpend=colMap.spend!==undefined;
  const hasMsgs=colMap.messages!==undefined;
  if(!hasSpend&&!hasMsgs)return null;

  return(
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Donut */}
      {hasSpend&&(
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Spend by group</p>
          <div className="flex items-center gap-4">
            <div style={{width:148,height:148,flexShrink:0}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData.map(([name,value])=>({name,value}))} cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" strokeWidth={0}
                    onClick={(data)=>onGroupClick((data as {name:string}).name)} style={{cursor:"pointer"}}>
                    {donutData.map(([name],i)=>(
                      <Cell key={name} fill={groupColorMap[name]??groupColor(i)}
                        opacity={activeGroupFilter&&activeGroupFilter!==name?0.3:1}/>
                    ))}
                  </Pie>
                  <RechartTooltip
                    contentStyle={{background:"var(--background)",border:"1px solid var(--border)",borderRadius:8,fontSize:11}}
                    formatter={(v:number)=>[`฿${fmtB(v)}`,""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              {donutData.map(([name,value],i)=>(
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{background:groupColorMap[name]??groupColor(i)}}/>
                  <span className="text-muted-foreground truncate flex-1">{name}</span>
                  <span className="font-semibold tabular-nums">{totalSpend>0?((value/totalSpend)*100).toFixed(0):0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Horizontal bar */}
      {hasMsgs&&msgData.length>0&&(
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Messages by group</p>
          <ResponsiveContainer width="100%" height={msgData.length*36+8}>
            <BarChart data={msgData} layout="vertical" margin={{left:0,right:24,top:0,bottom:0}}>
              <XAxis type="number" hide/>
              <YAxis type="category" dataKey="name" width={90} tick={{fontSize:11,fill:"var(--muted-foreground)"}} axisLine={false} tickLine={false}/>
              <RechartTooltip
                contentStyle={{background:"var(--background)",border:"1px solid var(--border)",borderRadius:8,fontSize:11}}
                formatter={(v:number,[,,entry]:[unknown,unknown,{payload:{full:string}}])=>[v,entry?.payload?.full??""]}
              />
              <Bar dataKey="value" radius={[0,4,4,0]} maxBarSize={18}
                onClick={(data)=>onGroupClick((data as {full:string}).full)} style={{cursor:"pointer"}}>
                {msgData.map((entry,i)=>(
                  <Cell key={entry.name} fill={groupColorMap[entry.full]??groupColor(i)}
                    opacity={activeGroupFilter&&activeGroupFilter!==entry.full?0.3:1}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({values,color}:{values:number[];color:string}){
  if(values.length<2)return null;
  const w=64,h=28,pad=3;
  const min=Math.min(...values),max=Math.max(...values);
  const range=max-min||1;
  const pts=values.map((v,i)=>{
    const x=pad+(i/(values.length-1))*(w-pad*2);
    const y=h-pad-((v-min)/range)*(h-pad*2);
    return`${x},${y}`;
  }).join(" ");
  const last=pts.split(" ").pop()!.split(",");
  return(
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color}/>
    </svg>
  );
}

// ── ③ Group Card (v6: sortable columns + heatmap + inline compare delta) ─────
function GroupCard({groupName,ads,cm,expanded,onToggle,color,totalSpend,compareAds}:{
  groupName:string;ads:AdRow[];cm:ColumnMap;expanded:boolean;onToggle:()=>void;
  color:string;totalSpend:number;compareAds?:AdRow[];
}){
  const[colSort,setColSort]=useState<{key:ColSortKey;dir:'asc'|'desc'}|null>(null);

  const gSpend=sumN(ads,"spend");
  const gMsgs=sumN(ads,"messages");
  const gImpr=sumN(ads,"impressions");
  const gReach=sumN(ads,"reach");
  const avgCPM=avgN(ads,"cpm");
  const avgCTR=avgN(ads,"ctr");
  const active=ads.filter(a=>a.status.toLowerCase()==="active").length;
  const spendPct=totalSpend>0?(gSpend/totalSpend)*100:0;
  const sparkValues=ads.map(a=>a.spend??0).filter(v=>v>0);

  // Heatmap ranges (min/max per column across all ads in this group)
  const heatMeta:{k:keyof AdRow;hib:boolean;neutral?:boolean}[]=[
    {k:"spend",hib:false,neutral:true},
    {k:"impressions",hib:true},{k:"reach",hib:true},
    {k:"cpm",hib:false},{k:"ctr",hib:true},
    {k:"messages",hib:true},{k:"costPerMsg",hib:false},
    {k:"pageEngagement",hib:true},
  ];
  const heatRange:Record<string,{min:number;max:number;hib:boolean;neutral:boolean}>=useMemo(()=>{
    const out:Record<string,{min:number;max:number;hib:boolean;neutral:boolean}>={};
    for(const{k,hib,neutral=false}of heatMeta){
      const vals=ads.map(a=>a[k]).filter(v=>typeof v==="number")as number[];
      if(vals.length>1)out[k as string]={min:Math.min(...vals),max:Math.max(...vals),hib,neutral};
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ads]);

  // Compare map: ad name → compare AdRow
  const cmpMap=useMemo(()=>
    compareAds?Object.fromEntries(compareAds.map(a=>[a.name,a])):{},
  [compareAds]);
  const hasCmp=!!(compareAds&&compareAds.length>0);

  // Column sort toggle
  const onColSort=(key:ColSortKey)=>setColSort(prev=>
    prev?.key===key?{key,dir:prev.dir==='asc'?'desc':'asc'}:{key,dir:'desc'}
  );

  // Sorted rows
  const sortedAds=useMemo(()=>{
    if(!colSort)return ads;
    return[...ads].sort((a,b)=>{
      const dir=colSort.dir==='asc'?1:-1;
      if(colSort.key==='name')return dir*a.name.localeCompare(b.name);
      const av=a[colSort.key as keyof AdRow]as number|null;
      const bv=b[colSort.key as keyof AdRow]as number|null;
      if(av===null&&bv===null)return 0;
      if(av===null)return 1;
      if(bv===null)return -1;
      return dir*(av-bv);
    });
  },[ads,colSort]);

  // Sortable header <th>
  const SortTh=({label,colKey}:{label:string;colKey:ColSortKey})=>{
    const isActive=colSort?.key===colKey;
    return(
      <th onClick={()=>onColSort(colKey)}
        className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right cursor-pointer select-none hover:text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap">
        <span className="inline-flex items-center justify-end gap-0.5">
          {label}
          <span className={`text-[9px] ${isActive?"text-violet-400":"text-muted-foreground/30"}`}>
            {isActive?(colSort!.dir==='asc'?'↑':'↓'):'↕'}
          </span>
        </span>
      </th>
    );
  };

  // Numeric cell with heatmap background + optional inline compare delta
  const Cell=({col,value,fmt,hib}:{col:keyof AdRow;value:number|null;fmt:(v:number|null)=>string;hib:boolean})=>{
    const hr=heatRange[col as string];
    const bg=hr?heatBg(value,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
    const cmpAd=cmpMap[(sortedAds.find(a=>a[col]===value&&a[col]!==null)||{name:""}).name];
    return(
      <td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
        <div className="font-medium">{fmt(value)}</div>
        {hasCmp&&cmpAd&&<InlineDelta a={value} b={cmpAd[col]as number|null} higherIsBetter={hib}/>}
      </td>
    );
  };

  return(
    <div className="rounded-2xl border bg-card overflow-hidden" style={{borderLeftColor:color,borderLeftWidth:3}}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{groupName}</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{ads.length} โฆษณา</span>
            {active>0&&<span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">{active} กำลังแสดง</span>}
          </div>
          {cm.spend!==undefined&&(
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{width:`${spendPct}%`,background:color}}/>
            </div>
          )}
          <div className="flex gap-3 mt-1.5 flex-wrap items-center">
            {cm.spend!==undefined&&<span className="text-xs text-muted-foreground">Spend <b className="text-foreground">฿{fmtB(gSpend)}</b> <span className="text-[10px] opacity-60">({spendPct.toFixed(0)}%)</span></span>}
            {cm.impressions!==undefined&&<span className="text-xs text-muted-foreground">Impr. <b className="text-foreground">{fmtInt(gImpr)}</b></span>}
            {cm.reach!==undefined&&<span className="text-xs text-muted-foreground">Reach <b className="text-foreground">{fmtInt(gReach)}</b></span>}
            {cm.messages!==undefined&&<span className="text-xs text-muted-foreground">Msg <b className="text-foreground">{fmtInt(gMsgs)}</b></span>}
            {cm.cpm!==undefined&&avgCPM!==null&&<span className="text-xs text-muted-foreground">CPM <b className="text-foreground">฿{fmtB(avgCPM)}</b></span>}
            {cm.ctr!==undefined&&avgCTR!==null&&<span className="text-xs text-muted-foreground">CTR <b className="text-foreground">{fmtN(avgCTR,2)}%</b></span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sparkValues.length>=2&&<Sparkline values={sparkValues} color={color}/>}
          <div className="text-muted-foreground">
            {expanded?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}
          </div>
        </div>
      </button>

      {expanded&&(
        <div className="overflow-x-auto border-t border-border/50">
          <table className="w-full min-w-max text-left">
            <thead>
              <tr className="bg-muted/30">
                {/* Ad Name — sortable */}
                <th onClick={()=>onColSort('name')}
                  className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground hover:bg-muted/60 transition-colors">
                  <span className="inline-flex items-center gap-0.5">
                    Ad Name
                    <span className={`text-[9px] ${colSort?.key==='name'?"text-violet-400":"text-muted-foreground/30"}`}>
                      {colSort?.key==='name'?(colSort.dir==='asc'?'↑':'↓'):'↕'}
                    </span>
                  </span>
                </th>
                <th className="py-2 px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Status</th>
                {cm.spend!==undefined&&<SortTh label="Spend (฿)" colKey="spend"/>}
                {cm.impressions!==undefined&&<SortTh label="Impr." colKey="impressions"/>}
                {cm.reach!==undefined&&<SortTh label="Reach" colKey="reach"/>}
                {cm.cpm!==undefined&&<SortTh label="CPM" colKey="cpm"/>}
                {cm.ctr!==undefined&&<SortTh label="CTR" colKey="ctr"/>}
                {cm.messages!==undefined&&<SortTh label="Messages" colKey="messages"/>}
                {cm.costPerMsg!==undefined&&<SortTh label="Cost/Msg" colKey="costPerMsg"/>}
                {cm.pageEngagement!==undefined&&<SortTh label="Page Eng." colKey="pageEngagement"/>}
              </tr>
            </thead>
            <tbody>
              {sortedAds.map((ad,i)=>{
                const cmpAd=cmpMap[ad.name];
                return(
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 text-xs font-medium max-w-[200px]">
                      <span className="truncate block" title={ad.name}>{ad.name}</span>
                    </td>
                    <td className="py-2 px-2 text-center"><StatusBadge status={ad.status}/></td>
                    {cm.spend!==undefined&&(()=>{
                      const hr=heatRange["spend"];
                      const bg=hr?heatBg(ad.spend,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{ad.spend===null?"—":`฿${fmtB(ad.spend)}`}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.spend} b={cmpAd.spend} higherIsBetter={false}/>}
                      </td>;
                    })()}
                    {cm.impressions!==undefined&&(()=>{
                      const hr=heatRange["impressions"];
                      const bg=hr?heatBg(ad.impressions,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{fmtInt(ad.impressions)}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.impressions} b={cmpAd.impressions} higherIsBetter={true}/>}
                      </td>;
                    })()}
                    {cm.reach!==undefined&&(()=>{
                      const hr=heatRange["reach"];
                      const bg=hr?heatBg(ad.reach,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{fmtInt(ad.reach)}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.reach} b={cmpAd.reach} higherIsBetter={true}/>}
                      </td>;
                    })()}
                    {cm.cpm!==undefined&&(()=>{
                      const hr=heatRange["cpm"];
                      const bg=hr?heatBg(ad.cpm,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{ad.cpm===null?"—":`฿${fmtB(ad.cpm)}`}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.cpm} b={cmpAd.cpm} higherIsBetter={false}/>}
                      </td>;
                    })()}
                    {cm.ctr!==undefined&&(()=>{
                      const hr=heatRange["ctr"];
                      const bg=hr?heatBg(ad.ctr,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{ad.ctr!==null?fmtN(ad.ctr,2)+"%":"—"}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.ctr} b={cmpAd.ctr} higherIsBetter={true}/>}
                      </td>;
                    })()}
                    {cm.messages!==undefined&&(()=>{
                      const hr=heatRange["messages"];
                      const bg=hr?heatBg(ad.messages,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{fmtInt(ad.messages)}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.messages} b={cmpAd.messages} higherIsBetter={true}/>}
                      </td>;
                    })()}
                    {cm.costPerMsg!==undefined&&(()=>{
                      const hr=heatRange["costPerMsg"];
                      const bg=hr?heatBg(ad.costPerMsg,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{ad.costPerMsg===null?"—":`฿${fmtB(ad.costPerMsg)}`}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.costPerMsg} b={cmpAd.costPerMsg} higherIsBetter={false}/>}
                      </td>;
                    })()}
                    {cm.pageEngagement!==undefined&&(()=>{
                      const hr=heatRange["pageEngagement"];
                      const bg=hr?heatBg(ad.pageEngagement,hr.min,hr.max,hr.hib,hr.neutral):"transparent";
                      return<td className="py-2 px-2 text-right text-xs tabular-nums transition-colors" style={{background:bg}}>
                        <div className="font-medium">{fmtInt(ad.pageEngagement)}</div>
                        {hasCmp&&cmpAd&&<InlineDelta a={ad.pageEngagement} b={cmpAd.pageEngagement} higherIsBetter={true}/>}
                      </td>;
                    })()}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Legend */}
          {ads.length>1&&(
            <div className="flex items-center gap-4 px-3 py-2 border-t border-border/30 bg-muted/10">
              <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Heatmap:</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400"><span className="w-2.5 h-2 rounded-sm" style={{background:"rgba(29,158,117,0.22)"}}/>ดีสุด</span>
              <span className="flex items-center gap-1 text-[9px] text-amber-400"><span className="w-2.5 h-2 rounded-sm" style={{background:"rgba(239,159,39,0.16)"}}/>กลาง</span>
              <span className="flex items-center gap-1 text-[9px] text-red-400"><span className="w-2.5 h-2 rounded-sm" style={{background:"rgba(239,68,68,0.22)"}}/>ต้องปรับ</span>
              <span className="flex items-center gap-1 text-[9px] text-violet-400"><span className="w-2.5 h-2 rounded-sm" style={{background:"rgba(127,119,221,0.18)"}}/>Spend (scale)</span>
              {hasCmp&&<span className="ml-auto text-[9px] text-muted-foreground">▲▼ = เทียบ period ก่อน</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ④ Insight cards (sticky-note style) ──────────────────────────────────────
function InsightForm({period}:{period:string}){
  const key=`ads-insight::${period}`;
  const load=()=>{try{return JSON.parse(localStorage.getItem(key)??"{}") as{win?:string;fix?:string;plan?:string};}catch{return{};}}
  const[win,setWin]=useState(()=>load().win??"");
  const[fix,setFix]=useState(()=>load().fix??"");
  const[plan,setPlan]=useState(()=>load().plan??"");
  const[saved,setSaved]=useState(false);
  const handleSave=()=>{localStorage.setItem(key,JSON.stringify({win,fix,plan}));setSaved(true);setTimeout(()=>setSaved(false),2000);};

  const cards=[
    {key:"win",label:"Win",sublabel:"สิ่งที่ทำได้ดี",icon:<Trophy className="w-3.5 h-3.5"/>,val:win,set:setWin,ph:"โฆษณาตัวไหนทำได้ดี? เพราะอะไร?",border:"#1D9E75",bg:"rgba(29,158,117,0.07)",text:"#1D9E75"},
    {key:"fix",label:"Fix",sublabel:"สิ่งที่ต้องแก้ไข",icon:<Wrench className="w-3.5 h-3.5"/>,val:fix,set:setFix,ph:"โฆษณาตัวไหนแย่? ปัญหาคืออะไร?",border:"#EF9F27",bg:"rgba(239,159,39,0.07)",text:"#EF9F27"},
    {key:"plan",label:"Plan",sublabel:"แผนถัดไป",icon:<Rocket className="w-3.5 h-3.5"/>,val:plan,set:setPlan,ph:"จะปรับอะไรในช่วงถัดไป?",border:"#7F77DD",bg:"rgba(127,119,221,0.07)",text:"#7F77DD"},
  ] as const;

  return(
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Insights</p>
          <p className="text-xs text-muted-foreground">{period}</p>
        </div>
        <button onClick={handleSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${saved?"bg-emerald-500/20 text-emerald-400":"bg-violet-600 hover:bg-violet-500 text-white"}`}>
          {saved?<CheckCircle2 className="w-3.5 h-3.5"/>:<Save className="w-3.5 h-3.5"/>}
          {saved?"บันทึกแล้ว!":"บันทึก Insights"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map(({key:k,label,sublabel,icon,val,set,ph,border,bg,text})=>(
          <div key={k} style={{background:bg,borderLeft:`3px solid ${border}`,borderRadius:"0 12px 12px 0"}} className="p-4 space-y-2">
            <div className="flex items-center gap-2" style={{color:text}}>
              {icon}
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] opacity-70">— {sublabel}</span>
            </div>
            <textarea
              value={val}
              onChange={e=>set(e.target.value)}
              placeholder={ph}
              className="w-full text-sm resize-none h-24 bg-transparent focus:outline-none placeholder:text-muted-foreground/40 text-foreground"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compare Panel ─────────────────────────────────────────────────────────────
function ComparePanel({a,b}:{a:ReportData;b:ReportData}){
  const rows=[
    {label:"ยอดใช้จ่าย (฿)",valA:sumN(a.ads,"spend"),valB:sumN(b.ads,"spend"),fmt:(v:number)=>`฿${fmtB(v)}`,hib:false},
    {label:"Impressions",valA:sumN(a.ads,"impressions"),valB:sumN(b.ads,"impressions"),fmt:fmtInt,hib:true},
    {label:"Reach",valA:sumN(a.ads,"reach"),valB:sumN(b.ads,"reach"),fmt:fmtInt,hib:true},
    {label:"Messages",valA:sumN(a.ads,"messages"),valB:sumN(b.ads,"messages"),fmt:fmtInt,hib:true},
    {label:"CPM เฉลี่ย",valA:avgN(a.ads,"cpm"),valB:avgN(b.ads,"cpm"),fmt:(v:number)=>`฿${fmtB(v)}`,hib:false},
    {label:"CTR เฉลี่ย",valA:avgN(a.ads,"ctr"),valB:avgN(b.ads,"ctr"),fmt:(v:number)=>`${fmtN(v,2)}%`,hib:true},
  ];
  return(
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/20">
        <GitCompare className="w-4 h-4 text-violet-400"/>
        <span className="font-semibold text-sm">เปรียบเทียบ KPI</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="py-2.5 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-left">KPI</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-violet-400 text-right">{a.period_label}</th>
              <th className="py-2.5 px-4 text-xs font-semibold text-blue-400 text-right">{b.period_label}</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">เปลี่ยน</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({label,valA,valB,fmt,hib})=>(
              <tr key={label} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 text-xs text-muted-foreground">{label}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-violet-300">{valA!==null?fmt(valA):"—"}</td>
                <td className="py-3 px-4 text-sm font-semibold text-right text-blue-300">{valB!==null?fmt(valB):"—"}</td>
                <td className="py-3 px-4 text-center"><DeltaBadge a={valA} b={valB} higherIsBetter={hib}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Upload Zone ───────────────────────────────────────────────────────────────
function UploadZone({onFile,compact=false}:{onFile:(text:string,name:string)=>void;compact?:boolean}){
  const[dragging,setDragging]=useState(false);
  const inputRef=useRef<HTMLInputElement>(null);
  const readFile=(file:File)=>{
    if(!file.name.endsWith(".csv")){alert("กรุณาอัปโหลดไฟล์ .csv เท่านั้น");return;}
    const reader=new FileReader();
    reader.onload=e=>onFile(e.target?.result as string,file.name);
    reader.readAsText(file,"utf-8");
  };
  const onDrop=useCallback((e:React.DragEvent)=>{
    e.preventDefault();setDragging(false);
    const file=e.dataTransfer.files[0];if(file)readFile(file);
  },[]);
  if(compact){
    return(
      <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all text-sm font-semibold
        ${dragging?"bg-violet-500/20 text-violet-300":"bg-violet-600 hover:bg-violet-500 text-white"}`}
        onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
        <Plus className="w-4 h-4"/> Upload Report
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e=>{const f=e.target.files?.[0];if(f)readFile(f);e.target.value="";}}/>
      </label>
    );
  }
  return(
    <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}
      onClick={()=>inputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-3 py-16 px-8 text-center
        ${dragging?"border-violet-500 bg-violet-500/10":"border-border hover:border-violet-400 hover:bg-muted/20"}`}>
      <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center">
        <Upload className="w-7 h-7 text-violet-400"/>
      </div>
      <div>
        <p className="font-semibold text-sm">ลาก CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
        <p className="text-xs text-muted-foreground mt-1">ไฟล์ Meta Ads Manager Export (.csv)</p>
      </div>
      <input ref={inputRef} type="file" accept=".csv" className="hidden"
        onChange={e=>{const f=e.target.files?.[0];if(f)readFile(f);e.target.value="";}}/>
    </div>
  );
}

// ── Supabase / localStorage helpers ──────────────────────────────────────────
async function sbLoadReports():Promise<ReportMeta[]>{
  if(!supabase)return lsLoadList();
  const{data,error}=await supabase.from("ads_reports").select("id,period_label,file_name,uploaded_at,uploaded_by").order("uploaded_at",{ascending:false});
  if(error)return lsLoadList();
  return(data??[]) as ReportMeta[];
}
async function sbSaveReport(p:{period_label:string;start_date:string;end_date:string;file_name:string;uploaded_by:string;rows_json:AdRow[];col_map:ColumnMap}):Promise<string|null>{
  if(!supabase)return lsSaveReport(p);
  const{data,error}=await supabase.from("ads_reports").insert({...p}).select("id").single();
  if(error)return lsSaveReport(p);
  return data?.id??null;
}
async function sbLoadData(id:string):Promise<{ads:AdRow[];colMap:ColumnMap}|null>{
  if(!supabase)return lsLoadData(id);
  const{data,error}=await supabase.from("ads_reports").select("rows_json,col_map").eq("id",id).single();
  if(error)return lsLoadData(id);
  return{ads:(data.rows_json as AdRow[])??[],colMap:(data.col_map as ColumnMap)??{}};
}
async function sbDeleteReport(id:string):Promise<void>{
  if(!supabase){lsDeleteReport(id);return;}
  await supabase.from("ads_reports").delete().eq("id",id);
}

const LS_LIST="ads-report-list-v2";const lsKey=(id:string)=>`ads-report-data-v2::${id}`;
function lsLoadList():ReportMeta[]{try{return JSON.parse(localStorage.getItem(LS_LIST)??"[]");}catch{return[];}}
function lsSaveList(list:ReportMeta[]){localStorage.setItem(LS_LIST,JSON.stringify(list));}
function lsSaveReport(p:{period_label:string;file_name:string;uploaded_by:string;rows_json:AdRow[];col_map:ColumnMap;start_date:string;end_date:string}):string{
  const id=`local-${Date.now()}`;const list=lsLoadList();
  const meta:ReportMeta={id,period_label:p.period_label,file_name:p.file_name,uploaded_at:new Date().toISOString(),uploaded_by:p.uploaded_by};
  lsSaveList([meta,...list]);localStorage.setItem(lsKey(id),JSON.stringify({ads:p.rows_json,colMap:p.col_map}));return id;
}
function lsLoadData(id:string):{ads:AdRow[];colMap:ColumnMap}|null{try{return JSON.parse(localStorage.getItem(lsKey(id))??"null");}catch{return null;}}
function lsDeleteReport(id:string){lsSaveList(lsLoadList().filter(r=>r.id!==id));localStorage.removeItem(lsKey(id));}

// ── Top Performers — Premium Editorial Cards ──────────────────────────────────
function TopPerformers({ads,groupColorMap,onGroupClick,activeGroupFilter}:{
  ads:AdRow[];groupColorMap:Record<string,string>;onGroupClick:(g:string)=>void;activeGroupFilter:string|null;
}){
  if(ads.length===0)return null;
  const groups=ads.reduce<Record<string,AdRow[]>>((acc,ad)=>{
    if(!acc[ad.group])acc[ad.group]=[];acc[ad.group].push(ad);return acc;
  },{});
  const entries=Object.entries(groups);
  const topCTR=entries.filter(([,a])=>avgN(a,"ctr")!==null)
    .sort(([,a],[,b])=>(avgN(b,"ctr")??0)-(avgN(a,"ctr")??0))[0];
  const topMsg=entries.filter(([,a])=>sumN(a,"messages")>0)
    .sort(([,a],[,b])=>sumN(b,"messages")-sumN(a,"messages"))[0];
  const topCPM=entries.filter(([,a])=>avgN(a,"cpm")!==null)
    .sort(([,a],[,b])=>(avgN(a,"cpm")??Infinity)-(avgN(b,"cpm")??Infinity))[0];
  const stars=[
    topCTR&&{name:topCTR[0],label:"CTR สูงสุด",sublabel:"Click-Through Rate",icon:<Trophy className="w-4 h-4"/>,color:"#EF9F27",val:`${fmtN(avgN(topCTR[1],"ctr"),2)}%`},
    topMsg&&{name:topMsg[0],label:"ข้อความมากสุด",sublabel:"Total Messages",icon:<MessageCircle className="w-4 h-4"/>,color:"#1D9E75",val:`${fmtInt(sumN(topMsg[1],"messages"))}`},
    topCPM&&{name:topCPM[0],label:"CPM ต่ำสุด",sublabel:"Cost per 1K Impressions",icon:<Zap className="w-4 h-4"/>,color:"#7F77DD",val:`฿${fmtB(avgN(topCPM[1],"cpm"))}`},
  ].filter(Boolean) as {name:string;label:string;sublabel:string;icon:React.ReactNode;color:string;val:string}[];
  if(stars.length===0)return null;

  const RANK_LABELS=["WINNER","TOP","BEST"];

  return(
    <div className="space-y-2">
      {/* Divider label */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1" style={{background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.08))"}}/>
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 px-2">Top Performers</span>
        <div className="h-px flex-1" style={{background:"linear-gradient(90deg,rgba(255,255,255,0.08),transparent)"}}/>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>
        {stars.map(({name,label,sublabel,icon,color,val},idx)=>{
          const isActive=activeGroupFilter===name;
          return(
            <button key={label} onClick={()=>onGroupClick(name)}
              className="relative overflow-hidden rounded-xl text-left transition-all duration-200 group cursor-pointer"
              style={{
                background:color,
                border:`1px solid ${isActive?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.15)"}`,
                boxShadow:isActive
                  ?`0 0 0 2px rgba(255,255,255,0.6),0 8px 24px ${color}80`
                  :`0 4px 16px ${color}50`,
                transform:isActive?"scale(1.02) translateY(-2px)":"scale(1)",
              }}>

              {/* Hover white overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                style={{background:"rgba(255,255,255,0.1)"}}/>

              {/* Watermark rank */}
              <span className="absolute -bottom-2 right-1 font-black select-none pointer-events-none leading-none"
                style={{fontSize:"5rem",color:"rgba(0,0,0,0.12)",lineHeight:1}}>{String(idx+1).padStart(2,"0")}</span>

              {/* Content */}
              <div className="relative z-10 px-4 pt-4 pb-3">

                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{background:"rgba(0,0,0,0.18)",color:"rgba(255,255,255,0.95)"}}>
                    {icon}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/60">
                    {RANK_LABELS[idx]}
                  </span>
                </div>

                {/* HERO NUMBER */}
                <p className="font-black leading-none tracking-tight mb-1.5"
                  style={{fontSize:"2.2rem",color:"#ffffff"}}>
                  {val}
                </p>

                <p className="text-[10px] font-bold text-white/75 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-xs font-semibold text-white truncate">{name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Ad Health Score ───────────────────────────────────────────────────────────
function AdHealthScore({ads,colMap}:{ads:AdRow[];colMap:ColumnMap}){
  const avgCTR     = colMap.ctr            !== undefined ? avgN(ads,"ctr")            : null;
  const avgCPM     = colMap.cpm            !== undefined ? avgN(ads,"cpm")            : null;
  const avgCostMsg = colMap.costPerMsg     !== undefined ? avgN(ads,"costPerMsg")     : null;
  const totImp     = sumN(ads,"impressions");
  const totEng     = colMap.pageEngagement !== undefined ? sumN(ads,"pageEngagement") : 0;

  // Sub-scores 0–100
  const ctrScore  = avgCTR     !== null ? Math.min(100,(avgCTR/2)*100)                           : null;
  const cpmScore  = avgCPM     !== null ? Math.max(0,Math.min(100,(150-avgCPM)/150*100))         : null;
  const msgScore  = avgCostMsg !== null ? Math.max(0,Math.min(100,(200-avgCostMsg)/200*100))     : null;
  const engScore  = colMap.pageEngagement !== undefined && totImp > 0
    ? Math.min(100,(totEng/totImp*1000)*10) : null;

  type SI={label:string;value:string;score:number;weight:number;color:string;bench:string};
  const subs:SI[]=[
    {label:"CTR",           value:avgCTR!==null?`${avgCTR.toFixed(2)}%`            :"—",score:ctrScore ??-1,weight:30,color:"#D4537E",bench:"เป้า ≥ 2%"},
    {label:"Cost per Msg",  value:avgCostMsg!==null?`฿${Math.round(avgCostMsg)}`   :"—",score:msgScore ??-1,weight:35,color:"#1D9E75",bench:"เป้า ≤ ฿100"},
    {label:"CPM",           value:avgCPM!==null?`฿${Math.round(avgCPM)}`           :"—",score:cpmScore ??-1,weight:20,color:"#378ADD",bench:"เป้า ≤ ฿60"},
    {label:"Engagement/1K", value:colMap.pageEngagement!==undefined&&totImp>0?(totEng/totImp*1000).toFixed(1):"—",score:engScore??-1,weight:15,color:"#EF9F27",bench:"เป้า ≥ 5"},
  ].filter(x=>x.score>=0) as SI[];

  if(subs.length<2)return null;

  const totalW = subs.reduce((a,x)=>a+x.weight,0);
  const score  = Math.round(subs.reduce((a,x)=>a+x.score*x.weight,0)/totalW);
  const anim   = useCountUp(score,1400);

  const col   = score>=70?"#1D9E75":score>=40?"#EF9F27":"#EF4444";
  const lbl   = score>=70?"ประสิทธิภาพดี":score>=40?"พอใช้ได้":"ต้องปรับปรุง";
  const desc  = score>=70?"โฆษณาทำงานได้ดี — ต่อยอดจากสิ่งที่ได้ผล":score>=40?"มีบางจุดที่ควรปรับ ดูรายละเอียดด้านขวา":"ประสิทธิภาพต่ำ — ตรวจสอบ metric ที่คะแนนต่ำ";

  // Gauge SVG helpers
  const cx=100,cy=108,r=82,sw=13;
  function arc(s1:number,s2:number):string{
    if(s1>=s2)return"";
    const a1=Math.PI-(s1/100*Math.PI), a2=Math.PI-(s2/100*Math.PI);
    const x1=(cx+r*Math.cos(a1)).toFixed(2), y1=(cy-r*Math.sin(a1)).toFixed(2);
    const x2=(cx+r*Math.cos(a2)).toFixed(2), y2=(cy-r*Math.sin(a2)).toFixed(2);
    return`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  }
  function tick(s:number){
    const a=Math.PI-(s/100*Math.PI);
    return{
      x1:(cx+(r-sw/2-3)*Math.cos(a)).toFixed(2), y1:(cy-(r-sw/2-3)*Math.sin(a)).toFixed(2),
      x2:(cx+(r+sw/2+3)*Math.cos(a)).toFixed(2), y2:(cy-(r+sw/2+3)*Math.sin(a)).toFixed(2),
    };
  }
  const t40=tick(40), t70=tick(70);

  return(
    <div className="rounded-2xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
        <div className="w-1.5 h-4 rounded-full" style={{background:"linear-gradient(to bottom,#7F77DD,#378ADD)"}}/>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ad Health Score</span>
        <span className="ml-auto text-[10px] text-muted-foreground/40">ประเมินจาก {subs.length} ตัวชี้วัด</span>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[210px]">
            <svg viewBox="0 0 200 126" className="w-full">
              {/* Zone arcs (dim) */}
              <path d={arc(0,40)}   fill="none" stroke="#EF44440F" strokeWidth={sw} strokeLinecap="butt"/>
              <path d={arc(40,70)}  fill="none" stroke="#EF9F270F" strokeWidth={sw} strokeLinecap="butt"/>
              <path d={arc(70,100)} fill="none" stroke="#1D9E750F" strokeWidth={sw} strokeLinecap="butt"/>
              {/* Zone ticks */}
              <line x1={t40.x1} y1={t40.y1} x2={t40.x2} y2={t40.y2} stroke="rgba(0,0,0,0.10)" strokeWidth="1.5"/>
              <line x1={t70.x1} y1={t70.y1} x2={t70.x2} y2={t70.y2} stroke="rgba(0,0,0,0.10)" strokeWidth="1.5"/>
              {/* Progress arc */}
              {score>0&&<path d={arc(0,Math.min(score,99.8))} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" opacity="0.85"/>}
              {/* Zone labels — use semi-opaque colored fills that work on both light/dark */}
              <text x="20"  y="124" fontSize="7.5" fill="#EF4444" fillOpacity="0.55" fontWeight="700" textAnchor="middle">ต่ำ</text>
              <text x="100" y="22"  fontSize="7.5" fill="#6B7280" fillOpacity="0.6"  fontWeight="700" textAnchor="middle">ดี</text>
              <text x="180" y="124" fontSize="7.5" fill="#1D9E75" fillOpacity="0.55" fontWeight="700" textAnchor="middle">สูง</text>
            </svg>
            {/* Score number — HTML overlay so it respects light/dark theme */}
            <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none"
              style={{top:"73%",transform:"translateY(-50%)"}}>
              <span className="font-black leading-none tabular-nums text-foreground" style={{fontSize:"2.4rem"}}>{anim}</span>
              <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">/100</span>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold"
              style={{background:`${col}20`,color:col,border:`1px solid ${col}40`}}>
              {lbl}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1.5 max-w-[180px] leading-relaxed">{desc}</p>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">รายละเอียดคะแนน</p>
          {subs.map(({label:l,value,score:s,weight,color,bench})=>(
            <div key={l}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{background:color}}/>
                  <span className="text-xs font-semibold text-foreground">{l}</span>
                  <span className="text-[9px] text-muted-foreground/50">({weight}%)</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-[10px] text-muted-foreground">{value}</span>
                  <span className="text-xs font-black w-9 text-right" style={{color}}>{Math.round(s)}<span className="text-[8px] opacity-50">คะแนน</span></span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${s}%`,background:color,transition:"width 1s ease-out"}}/>
              </div>
              <p className="text-[9px] text-muted-foreground/50 mt-0.5">{bench}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Presentation Mode v2 (10/10 redesign) ─────────────────────────────────────

/** Count-up animation hook — restarts whenever `dep` changes */
function usePCount(target:number,dep:number,dur=1100):number{
  const[v,setV]=useState(0);
  useEffect(()=>{
    setV(0);if(!target)return;
    let r:number;const t0=performance.now();
    const tick=(n:number)=>{const p=Math.min((n-t0)/dur,1);setV(Math.round(target*(1-Math.pow(1-p,3))));if(p<1)r=requestAnimationFrame(tick);};
    const id=setTimeout(()=>{r=requestAnimationFrame(tick);},80);
    return()=>{clearTimeout(id);cancelAnimationFrame(r);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[target,dep]);
  return v;
}

/** Animated horizontal fill bar — grows from 0 to pct% on mount */
function AnimBar({pct,color,delay=0}:{pct:number;color:string;delay?:number}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!ref.current)return;
    ref.current.style.width="0%";
    const id=setTimeout(()=>{
      if(ref.current){ref.current.style.transition="width 0.9s cubic-bezier(0.4,0,0.2,1)";ref.current.style.width=`${pct}%`;}
    },delay+80);
    return()=>clearTimeout(id);
  },[pct,delay]);
  return<div ref={ref} style={{width:0,height:"100%",background:color,borderRadius:"0 4px 4px 0"}}/>;
}

function PresentationMode({report,ads,cm,groupColorMap,onClose}:{
  report:ReportData;ads:AdRow[];cm:ColumnMap;groupColorMap:Record<string,string>;onClose:()=>void;
}){
  const[slide,setSlide]=useState(0);
  const TOTAL=8;
  const next=useCallback(()=>setSlide(s=>Math.min(s+1,TOTAL-1)),[]);
  const prev=useCallback(()=>setSlide(s=>Math.max(s-1,0)),[]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.key==="ArrowRight"||e.key==="ArrowDown")next();
      if(e.key==="ArrowLeft"||e.key==="ArrowUp")prev();
      if(e.key==="Escape")onClose();
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[next,prev,onClose]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const totalSpend=sumN(ads,"spend");
  const totalImpr=sumN(ads,"impressions");
  const totalReach=sumN(ads,"reach");
  const totalMsgs=sumN(ads,"messages");
  const avgCPM=avgN(ads,"cpm");
  const avgCTR=avgN(ads,"ctr");
  const avgCostMsg=cm.costPerMsg!==undefined?avgN(ads,"costPerMsg"):null;
  const totEng=cm.pageEngagement!==undefined?sumN(ads,"pageEngagement"):0;

  const ctrScore=avgCTR!==null?Math.min(100,(avgCTR/2)*100):null;
  const cpmScore=avgCPM!==null?Math.max(0,Math.min(100,(150-avgCPM)/150*100)):null;
  const msgScore=avgCostMsg!==null?Math.max(0,Math.min(100,(200-avgCostMsg)/200*100)):null;
  const engScore=cm.pageEngagement!==undefined&&totalImpr>0?Math.min(100,(totEng/totalImpr*1000)*10):null;
  const psubs=[
    ctrScore!==null&&{label:"CTR",score:ctrScore,weight:30,color:"#D4537E",value:`${avgCTR!.toFixed(2)}%`,bench:"เป้า ≥ 2%"},
    msgScore!==null&&{label:"Cost/Msg",score:msgScore,weight:35,color:"#1D9E75",value:`฿${Math.round(avgCostMsg!)}`,bench:"เป้า ≤ ฿100"},
    cpmScore!==null&&{label:"CPM",score:cpmScore,weight:20,color:"#378ADD",value:`฿${Math.round(avgCPM!)}`,bench:"เป้า ≤ ฿60"},
    engScore!==null&&{label:"Eng/1K",score:engScore,weight:15,color:"#EF9F27",value:(totEng/totalImpr*1000).toFixed(1),bench:"เป้า ≥ 5"},
  ].filter(Boolean) as {label:string;score:number;weight:number;color:string;value:string;bench:string}[];
  const totalW=psubs.reduce((a,x)=>a+x.weight,0);
  const healthScore=psubs.length>=2?Math.round(psubs.reduce((a,x)=>a+x.score*x.weight,0)/totalW):null;
  const healthColor=healthScore===null?"#7F77DD":healthScore>=70?"#1D9E75":healthScore>=40?"#EF9F27":"#EF4444";
  const healthLabel=healthScore===null?"—":healthScore>=70?"ประสิทธิภาพดี":healthScore>=40?"พอใช้ได้":"ต้องปรับปรุง";

  const groups=useMemo(()=>Object.entries(
    ads.reduce<Record<string,AdRow[]>>((acc,ad)=>{if(!acc[ad.group])acc[ad.group]=[];acc[ad.group].push(ad);return acc;},{})
  ).sort(([,a],[,b])=>sumN(b,"spend")-sumN(a,"spend")),[ads]);

  const topCTRG=useMemo(()=>[...groups].filter(([,a])=>avgN(a,"ctr")!==null).sort(([,a],[,b])=>(avgN(b,"ctr")??0)-(avgN(a,"ctr")??0))[0],[groups]);
  const topMsgG=useMemo(()=>[...groups].filter(([,a])=>sumN(a,"messages")>0).sort(([,a],[,b])=>sumN(b,"messages")-sumN(a,"messages"))[0],[groups]);
  const topCPMG=useMemo(()=>[...groups].filter(([,a])=>avgN(a,"cpm")!==null).sort(([,a],[,b])=>(avgN(a,"cpm")??Infinity)-(avgN(b,"cpm")??Infinity))[0],[groups]);

  const inefficient=useMemo(()=>ads.map(ad=>{
    const issues:string[]=[];
    if(cm.ctr!==undefined&&ad.ctr!==null&&ad.ctr<2)issues.push(`CTR ${ad.ctr.toFixed(2)}% ต่ำ`);
    if(cm.cpm!==undefined&&ad.cpm!==null&&ad.cpm>100)issues.push(`CPM ฿${Math.round(ad.cpm)} สูง`);
    if(cm.costPerMsg!==undefined&&ad.costPerMsg!==null&&ad.costPerMsg>100)issues.push(`Cost/Msg ฿${Math.round(ad.costPerMsg)} สูง`);
    const engR=cm.pageEngagement!==undefined&&ad.impressions&&ad.impressions>0?(ad.pageEngagement??0)/ad.impressions*1000:null;
    if(engR!==null&&engR<5)issues.push(`Eng/1K ${engR.toFixed(1)} ต่ำ`);
    return{ad,issues};
  }).filter(x=>x.issues.length>=1).sort((a,b)=>b.issues.length-a.issues.length).slice(0,5),[ads,cm]);

  const insightKey=`ads-insight::${report.period_label}`;
  const insights=(()=>{try{return JSON.parse(localStorage.getItem(insightKey)??"{}") as Record<string,string>;}catch{return{};}})();
  const maxGroupSpend=groups.length>0?Math.max(...groups.slice(0,6).map(([,a])=>sumN(a,"spend"))):1;

  // ── Count-up hooks (only for the active slide) ───────────────────────────────
  // Slide 0+1 share spend; multiply by 100 so cents animate smoothly
  const animSpendCents=usePCount(slide<=1?Math.round(totalSpend*100):0,slide);
  const animImpr=usePCount(slide===1?Math.round(totalImpr):0,slide);
  const animReach=usePCount(slide===1?Math.round(totalReach):0,slide);
  const animMsgs=usePCount(slide===1?Math.round(totalMsgs):0,slide);
  const animScore=usePCount(slide===2&&healthScore!==null?healthScore:0,slide,1500);

  // Format helpers local to PM
  const fmtSpend=(cents:number)=>(cents/100).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});

  // ── Design tokens ─────────────────────────────────────────────────────────────
  const ACC="#7F77DD";
  const T1="#ffffff";
  const T3="rgba(255,255,255,0.32)";
  const CB="rgba(255,255,255,0.055)";
  const BR="rgba(255,255,255,0.09)";
  // Padding: 56px top/bottom, 72px left/right — never touch edges
  const PAD="56px 72px";

  // ── Animation wrapper: fades up with configurable delay ──────────────────────
  const A=({d=0,children}:{d?:number;children:React.ReactNode})=>(
    <div style={{animation:`psFadeUp 0.5s ease-out ${d}ms both`}}>{children}</div>
  );

  // ── Slide header ─────────────────────────────────────────────────────────────
  const SH=({title,sub,ac=ACC}:{title:string;sub?:string;ac?:string})=>(
    <A><div style={{marginBottom:"1.25rem",flexShrink:0,textAlign:"center"}}>
      <div style={{width:32,height:2,background:ac,borderRadius:1,margin:"0 auto 14px"}}/>
      <h2 style={{fontSize:"clamp(3.5rem,7vw,7rem)",fontWeight:800,color:T1,lineHeight:0.95,letterSpacing:"-0.025em",margin:0}}>{title}</h2>
      {sub&&<p style={{fontSize:13,color:T3,margin:"8px 0 0"}}>{sub}</p>}
    </div></A>
  );

  // ── Render slides ─────────────────────────────────────────────────────────────
  const renderSlide=()=>{
    switch(slide){

      // ① Cover ─────────────────────────────────────────────────────────────────
      case 0:return(
        <div key={0} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          {/* Brand mark */}
          <A><div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:22,height:22,borderRadius:6,background:`${ACC}28`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <TrendingUp size={11} style={{color:ACC}}/>
            </div>
            <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.18em",color:T3,textTransform:"uppercase"}}>Standard Tour CRM</span>
          </div></A>

          {/* Center hero */}
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",gap:20}}>
            <A d={80}><p style={{fontSize:"clamp(1.1rem,2.2vw,2rem)",fontWeight:700,letterSpacing:"0.4em",color:T3,textTransform:"uppercase",margin:0}}>Meta Ads Report</p></A>
            <A d={170}><h1 style={{fontSize:"clamp(3rem,6vw,5.5rem)",fontWeight:800,color:T1,lineHeight:1.02,letterSpacing:"-0.025em",margin:0}}>{report.period_label}</h1></A>
            <A d={250}><div style={{width:52,height:1.5,background:`linear-gradient(90deg,transparent,${ACC},transparent)`}}/></A>
            {cm.spend!==undefined&&<A d={340}><div style={{textAlign:"center"}}>
              <p style={{fontSize:11,color:T3,letterSpacing:"0.15em",textTransform:"uppercase",margin:"0 0 10px"}}>ยอดใช้จ่ายรวม</p>
              <p style={{fontSize:"clamp(3rem,7vw,5.5rem)",fontWeight:800,color:ACC,lineHeight:1,letterSpacing:"-0.025em",margin:0}}>
                ฿{fmtSpend(animSpendCents)}
              </p>
            </div></A>}
          </div>

          {/* Footer */}
          <A d={480}><div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:T3}}>{report.uploaded_by??""}</span>
            <span style={{fontSize:12,color:T3}}>{ads.length} โฆษณา · {ads.filter(a=>a.status.toLowerCase()==="active").length} active</span>
          </div></A>
        </div>
      );

      // ② KPIs ──────────────────────────────────────────────────────────────────
      case 1:return(
        <div key={1} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <SH title="ภาพรวม KPIs" sub={report.period_label}/>
          <div style={{flex:1,display:"flex",gap:20,minHeight:0}}>
            {/* Hero — Spend */}
            <A d={80}><div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"32px 36px",borderRadius:18,background:CB,border:`0.5px solid ${BR}`,borderLeft:`3px solid ${ACC}`,minWidth:220,flexShrink:0,height:"100%"}}>
              <p style={{fontSize:11,fontWeight:600,color:T3,textTransform:"uppercase",letterSpacing:"0.12em",margin:"0 0 12px"}}>ยอดใช้จ่ายรวม</p>
              <p style={{fontSize:"clamp(3rem,6vw,5.5rem)",fontWeight:800,color:T1,lineHeight:1,letterSpacing:"-0.03em",margin:0}}>
                ฿{fmtSpend(animSpendCents)}
              </p>
              <div style={{width:28,height:2,background:ACC,borderRadius:1,marginTop:20}}/>
            </div></A>
            {/* 6 KPI cards — 3×2 grid, no empty slot */}
            <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"1fr 1fr",gap:12,minHeight:0}}>
              {[
                {label:"Impressions",val:cm.impressions!==undefined?animImpr.toLocaleString("th-TH"):"—",color:"#378ADD",av:cm.impressions!==undefined},
                {label:"Reach",val:cm.reach!==undefined?animReach.toLocaleString("th-TH"):"—",color:"#1D9E75",av:cm.reach!==undefined},
                {label:"Messages",val:cm.messages!==undefined?animMsgs.toLocaleString("th-TH"):"—",color:"#5DCAA5",av:cm.messages!==undefined},
                {label:"CPM เฉลี่ย",val:cm.cpm!==undefined?`฿${fmtB(avgCPM)}`:"—",color:"#EF9F27",av:cm.cpm!==undefined},
                {label:"CTR เฉลี่ย",val:cm.ctr!==undefined?`${fmtN(avgCTR,2)}%`:"—",color:"#D4537E",av:cm.ctr!==undefined},
                {label:"Cost/Msg",val:cm.costPerMsg!==undefined?`฿${fmtB(avgCostMsg)}`:"—",color:"#A78BFA",av:cm.costPerMsg!==undefined},
              ].map(({label,val,color,av},i)=>(
                <A key={label} d={120+i*45}><div style={{padding:"18px 22px",borderRadius:14,background:CB,border:`0.5px solid ${BR}`,opacity:av?1:0.3,height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                  <p style={{fontSize:11,fontWeight:600,color:T3,textTransform:"uppercase",letterSpacing:"0.1em",margin:0}}>{label}</p>
                  <p style={{fontSize:"clamp(2rem,4vw,3.5rem)",fontWeight:700,color:T1,lineHeight:1,letterSpacing:"-0.025em",margin:"6px 0 0"}}>{val}</p>
                  <div style={{height:2,background:color,borderRadius:1,width:22,marginTop:8}}/>
                </div></A>
              ))}
            </div>
          </div>
        </div>
      );

      // ③ Health Score ───────────────────────────────────────────────────────────
      case 2:return(
        <div key={2} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <SH title="Ad Health Score" sub={`ประเมินจาก ${psubs.length} ตัวชี้วัดหลัก`}/>
          {healthScore!==null?(
            <div style={{flex:1,display:"flex",gap:72,alignItems:"center",minHeight:0}}>
              {/* Arc gauge */}
              <A d={80}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:18,flexShrink:0}}>
                <svg width="280" height="172" viewBox="0 0 280 172">
                  {(()=>{
                    const cx=140,cy=158,r=120,sw=18;
                    const half=Math.PI*r;
                    const da=`${(animScore/100)*half} ${half}`;
                    return<>
                      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} strokeLinecap="round"/>
                      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={healthColor}
                        strokeWidth={sw} strokeLinecap="round" strokeDasharray={da}
                        style={{transition:"stroke-dasharray 1.5s ease-out"}}/>
                      <text x={cx} y={cy-24} textAnchor="middle" fill={T1} fontSize="72" fontWeight="800" fontFamily="system-ui,sans-serif">{animScore}</text>
                      <text x={cx} y={cy+4} textAnchor="middle" fill={T3} fontSize="15" fontFamily="system-ui,sans-serif">/100</text>
                    </>;
                  })()}
                </svg>
                <span style={{fontSize:15,fontWeight:700,padding:"8px 24px",borderRadius:99,background:`${healthColor}20`,color:healthColor,border:`1px solid ${healthColor}35`}}>{healthLabel}</span>
              </div></A>
              {/* Sub-scores */}
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:24}}>
                {psubs.map(({label,score,weight,color,value,bench},i)=>(
                  <A key={label} d={150+i*80}><div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:10,height:10,borderRadius:3,background:color}}/>
                        <span style={{fontSize:15,fontWeight:600,color:T1}}>{label}</span>
                        <span style={{fontSize:12,color:T3}}>({weight}%)</span>
                      </div>
                      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                        <span style={{fontSize:14,color:"rgba(255,255,255,0.5)"}}>{value}</span>
                        <span style={{fontSize:24,fontWeight:800,color,minWidth:36,textAlign:"right"}}>{Math.round(score)}</span>
                      </div>
                    </div>
                    <div style={{height:10,borderRadius:5,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                      <AnimBar pct={score} color={color} delay={200+i*80}/>
                    </div>
                    <p style={{fontSize:10,color:T3,margin:"4px 0 0"}}>{bench}</p>
                  </div></A>
                ))}
              </div>
            </div>
          ):<p style={{color:T3}}>ไม่มีข้อมูลเพียงพอ</p>}
        </div>
      );

      // ④ Spend by Group ────────────────────────────────────────────────────────
      case 3:return(
        <div key={3} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <SH title="สัดส่วนงบโฆษณา" sub={`Spend by Group · รวม ฿${fmtB(totalSpend)}`}/>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:20}}>
            {groups.slice(0,6).map(([name,gAds],i)=>{
              const gs=sumN(gAds,"spend");
              const pct=maxGroupSpend>0?(gs/maxGroupSpend)*100:0;
              const spPct=totalSpend>0?((gs/totalSpend)*100).toFixed(0):"0";
              const col=groupColorMap[name]??groupColor(i);
              return(
                <A key={name} d={80+i*65}><div style={{display:"flex",alignItems:"center",gap:18}}>
                  <div style={{width:200,flexShrink:0}}>
                    <p style={{fontSize:14,fontWeight:500,color:T1,margin:"0 0 3px",lineHeight:1.2}}>{name}</p>
                    <p style={{fontSize:11,color:T3,margin:0}}>{spPct}% · ฿{fmtB(gs)}</p>
                  </div>
                  <div style={{flex:1,height:30,borderRadius:4,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                    <AnimBar pct={pct} color={col} delay={120+i*65}/>
                  </div>
                  <p style={{fontSize:20,fontWeight:700,color:T1,minWidth:48,textAlign:"right"}}>{spPct}%</p>
                </div></A>
              );
            })}
          </div>
        </div>
      );

      // ⑤ Top Performers ────────────────────────────────────────────────────────
      case 4:return(
        <div key={4} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <SH title="Top Performers" sub="กลุ่มโฆษณาที่ทำได้ดีที่สุด"/>
          <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,minHeight:0}}>
            {[
              topCTRG&&{name:topCTRG[0],label:"CTR สูงสุด",icon:<MousePointerClick size={28}/>,color:"#EF9F27",val:`${fmtN(avgN(topCTRG[1],"ctr"),2)}%`,rank:"01"},
              topMsgG&&{name:topMsgG[0],label:"Messages มากสุด",icon:<MessageCircle size={28}/>,color:"#1D9E75",val:`${fmtInt(sumN(topMsgG[1],"messages"))}`,rank:"02"},
              topCPMG&&{name:topCPMG[0],label:"CPM ต่ำสุด",icon:<Zap size={28}/>,color:"#7F77DD",val:`฿${fmtB(avgN(topCPMG[1],"cpm"))}`,rank:"03"},
            ].filter(Boolean).map((star,i)=>{
              if(!star)return null;
              return(
                <A key={star.label} d={80+i*110}><div style={{position:"relative",borderRadius:20,overflow:"hidden",background:star.color,boxShadow:`0 12px 52px ${star.color}55`,height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"32px 32px 28px"}}>
                  <span style={{position:"absolute",bottom:-8,right:0,fontSize:"9rem",fontWeight:900,color:"rgba(0,0,0,0.12)",lineHeight:1,userSelect:"none"}}>{star.rank}</span>
                  <div style={{width:52,height:52,borderRadius:14,background:"rgba(0,0,0,0.22)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.95)"}}>
                    {star.icon}
                  </div>
                  <div style={{position:"relative",zIndex:1}}>
                    <p style={{fontSize:"clamp(2.5rem,4.5vw,4rem)",fontWeight:800,color:"#fff",lineHeight:1,letterSpacing:"-0.025em",margin:"0 0 8px"}}>{star.val}</p>
                    <p style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.12em",margin:"0 0 4px"}}>{star.label}</p>
                    <p style={{fontSize:15,fontWeight:600,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{star.name}</p>
                  </div>
                </div></A>
              );
            })}
          </div>
        </div>
      );

      // ⑥ Inefficient Ads ───────────────────────────────────────────────────────
      case 5:return(
        <div key={5} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <div style={{marginBottom:"1.75rem",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:24,flexShrink:0}}>
            <A><div style={{textAlign:"center"}}>
              <div style={{width:32,height:2,background:"#EF4444",borderRadius:1,margin:"0 auto 14px"}}/>
              <h2 style={{fontSize:"clamp(3.5rem,7vw,7rem)",fontWeight:800,color:T1,lineHeight:0.95,letterSpacing:"-0.025em",margin:0}}>โฆษณาที่ต้องปรับปรุง</h2>
              <p style={{fontSize:13,color:T3,margin:"8px 0 0"}}>CTR &lt; 2% · CPM &gt; ฿100 · Cost/Msg &gt; ฿100 · Eng/1K &lt; 5</p>
            </div></A>
            {inefficient.length>0&&<A d={60}><div style={{display:"flex",gap:12,flexShrink:0}}>
              <div style={{background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:14,padding:"14px 22px",textAlign:"center"}}>
                <p style={{fontSize:11,color:"rgba(248,113,113,0.65)",margin:"0 0 4px"}}>รายการ</p>
                <p style={{fontSize:32,fontWeight:700,color:"#F87171",lineHeight:1,margin:0}}>{inefficient.length}</p>
              </div>
              {cm.spend!==undefined&&<div style={{background:"rgba(239,159,39,0.12)",border:"1px solid rgba(239,159,39,0.25)",borderRadius:14,padding:"14px 22px",textAlign:"center"}}>
                <p style={{fontSize:11,color:"rgba(239,159,39,0.65)",margin:"0 0 4px"}}>งบที่ใช้</p>
                <p style={{fontSize:32,fontWeight:700,color:"#EF9F27",lineHeight:1,margin:0}}>฿{fmtB(inefficient.reduce((s,x)=>s+(x.ad.spend??0),0))}</p>
              </div>}
            </div></A>}
          </div>
          {inefficient.length===0?(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{textAlign:"center"}}>
                <CheckCircle2 size={56} style={{color:"#1D9E75",margin:"0 auto 12px"}}/>
                <p style={{fontSize:18,fontWeight:600,color:T1}}>โฆษณาทุกตัวอยู่ในเกณฑ์ที่ดี</p>
              </div>
            </div>
          ):(
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,overflow:"hidden"}}>
              {inefficient.map(({ad,issues},i)=>{
                const crit=issues.length>=2;
                const rec=crit?{label:"⏸ หยุดชั่วคราว",color:"#EF4444"}
                  :issues.some(s=>s.includes("CPM")||s.includes("Cost/Msg"))?{label:"🔧 ปรับ Audience",color:"#EF9F27"}
                  :{label:"👁 จับตาดู",color:"#378ADD"};
                return<A key={ad.name} d={80+i*70}><div style={{background:crit?"rgba(239,68,68,0.08)":"rgba(255,255,255,0.04)",border:`1px solid ${crit?"rgba(239,68,68,0.22)":"rgba(255,255,255,0.08)"}`,borderLeft:`3px solid ${rec.color}`,borderRadius:"0 14px 14px 0",padding:"16px 24px",display:"flex",alignItems:"center",gap:18}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:15,fontWeight:600,color:T1,margin:"0 0 8px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.name}</p>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {issues.map(iss=><span key={iss} style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:5,background:"rgba(239,68,68,0.15)",color:"#F87171",border:"0.5px solid rgba(239,68,68,0.3)"}}>{iss}</span>)}
                    </div>
                  </div>
                  <span style={{fontSize:13,fontWeight:600,padding:"8px 16px",borderRadius:9,background:`${rec.color}1A`,color:rec.color,border:`1px solid ${rec.color}30`,whiteSpace:"nowrap",flexShrink:0}}>{rec.label}</span>
                </div></A>;
              })}
            </div>
          )}
        </div>
      );

      // ⑦ Group Performance — animated bar chart (not table) ─────────────────────
      case 6:return(
        <div key={6} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <SH title="ผลรายกลุ่มโฆษณา" sub={`Top ${Math.min(5,groups.length)} กลุ่ม`}/>
          <div style={{flex:1,display:"flex",gap:24,minHeight:0}}>
            {/* Bar chart — main visual */}
            <div style={{flex:2,display:"flex",flexDirection:"column",justifyContent:"center",gap:20}}>
              {groups.slice(0,5).map(([name,gAds],i)=>{
                const gs=sumN(gAds,"spend");
                const pct=maxGroupSpend>0?(gs/maxGroupSpend)*100:0;
                const col=groupColorMap[name]??groupColor(i);
                return<A key={name} d={80+i*70}><div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div style={{width:8,height:8,borderRadius:2,background:col,flexShrink:0}}/>
                      <span style={{fontSize:14,fontWeight:500,color:T1}}>{name}</span>
                    </div>
                    <span style={{fontSize:14,fontWeight:700,color:T1}}>฿{fmtB(gs)}</span>
                  </div>
                  <div style={{height:24,borderRadius:4,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                    <AnimBar pct={pct} color={col} delay={140+i*70}/>
                  </div>
                </div></A>;
              })}
            </div>
            {/* Stats panel */}
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,justifyContent:"center"}}>
              {groups.slice(0,5).map(([name,gAds],i)=>{
                const col=groupColorMap[name]??groupColor(i);
                return<A key={name} d={120+i*70}><div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 16px",borderRadius:12,background:"rgba(255,255,255,0.05)",border:`0.5px solid ${BR}`}}>
                  <div style={{width:6,height:6,borderRadius:2,background:col,flexShrink:0}}/>
                  {cm.messages!==undefined&&<div style={{flex:1,textAlign:"center"}}>
                    <p style={{fontSize:10,color:T3,margin:"0 0 2px"}}>Msg</p>
                    <p style={{fontSize:17,fontWeight:700,color:T1,margin:0}}>{fmtInt(sumN(gAds,"messages"))}</p>
                  </div>}
                  {cm.ctr!==undefined&&<div style={{flex:1,textAlign:"center"}}>
                    <p style={{fontSize:10,color:T3,margin:"0 0 2px"}}>CTR</p>
                    <p style={{fontSize:17,fontWeight:700,color:T1,margin:0}}>{fmtN(avgN(gAds,"ctr"),2)}%</p>
                  </div>}
                  {cm.costPerMsg!==undefined&&<div style={{flex:1,textAlign:"center"}}>
                    <p style={{fontSize:10,color:T3,margin:"0 0 2px"}}>Cost/Msg</p>
                    <p style={{fontSize:17,fontWeight:700,color:T1,margin:0}}>฿{fmtB(avgN(gAds,"costPerMsg"))}</p>
                  </div>}
                </div></A>;
              })}
            </div>
          </div>
        </div>
      );

      // ⑧ Insights ──────────────────────────────────────────────────────────────
      case 7:return(
        <div key={7} className="absolute inset-0 flex flex-col overflow-hidden" style={{padding:PAD}}>
          <SH title="Insights" sub={report.period_label}/>
          <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,minHeight:0}}>
            {([
              {k:"win",label:"Win",sub:"สิ่งที่ทำได้ดี",color:"#1D9E75",icon:<Trophy size={26}/>},
              {k:"fix",label:"Fix",sub:"สิ่งที่ต้องแก้",color:"#EF9F27",icon:<Wrench size={26}/>},
              {k:"plan",label:"Plan",sub:"แผนถัดไป",color:"#7F77DD",icon:<Rocket size={26}/>},
            ] as const).map(({k,label,sub,color,icon},i)=>{
              const txt=insights[k]||"";
              return<A key={k} d={80+i*100}><div style={{height:"100%",borderRadius:16,padding:"28px",display:"flex",flexDirection:"column",gap:16,background:`${color}12`,border:`1px solid ${color}22`,borderTop:`3px solid ${color}`}}>
                <div style={{display:"flex",alignItems:"center",gap:12,color}}>
                  {icon}
                  <div>
                    <p style={{fontSize:18,fontWeight:700,color:T1,margin:0,lineHeight:1}}>{label}</p>
                    <p style={{fontSize:12,color:T3,margin:"3px 0 0"}}>{sub}</p>
                  </div>
                </div>
                <div style={{flex:1,overflow:"hidden"}}>
                  {txt
                    ?<p style={{fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,0.72)",margin:0}}>{txt}</p>
                    :<p style={{fontSize:14,color:T3,fontStyle:"italic",margin:0}}>กรอก Insight จากหน้า Dashboard เพื่อแสดงที่นี่</p>
                  }
                </div>
              </div></A>;
            })}
          </div>
        </div>
      );

      default:return null;
    }
  };

  const SLIDE_NAMES=["Cover","KPIs","Health","Spend","Top","แย่","Groups","Insights"];

  return(
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:"rgba(9,8,14,0.98)"}}>
      <style>{`@keyframes psFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Subtle dot grid overlay */}
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,rgba(127,119,221,0.06) 1px,transparent 1px)",backgroundSize:"52px 52px",pointerEvents:"none"}}/>
      {/* Slide area */}
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>{renderSlide()}</div>
      {/* Navigation bar */}
      <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:12,padding:"14px 40px",background:"rgba(0,0,0,0.58)",borderTop:"1px solid rgba(255,255,255,0.07)"}}>
        <button onClick={prev} disabled={slide===0}
          style={{width:36,height:36,borderRadius:10,background:slide===0?"transparent":"rgba(127,119,221,0.2)",border:"none",cursor:slide===0?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:slide===0?0.22:1,flexShrink:0}}>
          <ChevronLeft className="w-5 h-5 text-white"/>
        </button>
        <div style={{flex:1,display:"flex",alignItems:"flex-end",justifyContent:"center",gap:8}}>
          {SLIDE_NAMES.map((nm,i)=>(
            <button key={i} onClick={()=>setSlide(i)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"4px 2px"}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.35)",visibility:slide===i?"visible":"hidden",whiteSpace:"nowrap",fontFamily:"inherit"}}>{nm}</span>
              <div style={{height:3,borderRadius:2,transition:"all 0.25s ease",width:slide===i?28:8,background:slide===i?ACC:"rgba(255,255,255,0.2)"}}/>
            </button>
          ))}
        </div>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.22)",fontFamily:"monospace",minWidth:36,textAlign:"center",flexShrink:0}}>{slide+1}/{TOTAL}</span>
        <button onClick={next} disabled={slide===TOTAL-1}
          style={{width:36,height:36,borderRadius:10,background:slide===TOTAL-1?"transparent":"rgba(127,119,221,0.2)",border:"none",cursor:slide===TOTAL-1?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:slide===TOTAL-1?0.22:1,flexShrink:0}}>
          <ChevronRight className="w-5 h-5 text-white"/>
        </button>
        <button onClick={onClose} style={{width:36,height:36,borderRadius:10,background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:0.45,marginLeft:6,flexShrink:0}}>
          <X className="w-5 h-5" style={{color:"rgba(255,255,255,0.6)"}}/>
        </button>
      </div>
    </div>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdsReport(){
  const currentUser=useCurrentUser();
  const[reports,setReports]=useState<ReportMeta[]>([]);
  const[activeReport,setActiveReport]=useState<ReportData|null>(null);
  const[compareReport,setCompareReport]=useState<ReportData|null>(null);
  const[compareMode,setCompareMode]=useState(false);
  const[loadingList,setLoadingList]=useState(true);
  const[loadingReport,setLoadingReport]=useState(false);
  const[saving,setSaving]=useState(false);
  const[filterStatus,setFilterStatus]=useState<"all"|"active"|"not_delivering"|"archived">("all");
  const[sortBy,setSortBy]=useState<"spend"|"messages"|"ctr"|"cpm">("spend");
  const[activeGroupFilter,setActiveGroupFilter]=useState<string|null>(null);
  const[searchQuery,setSearchQuery]=useState("");
  const[expandedGroups,setExpandedGroups]=useState<Record<string,boolean>>({});
  const[deleteConfirm,setDeleteConfirm]=useState<string|null>(null);
  const[missingCols,setMissingCols]=useState<string[]>([]);
  const[presentMode,setPresentMode]=useState(false);

  useEffect(()=>{
    setLoadingList(true);
    sbLoadReports().then(list=>{setReports(list);setLoadingList(false);});
  },[]);

  const selectReport=async(meta:ReportMeta,forCompare=false)=>{
    setLoadingReport(true);const data=await sbLoadData(meta.id);setLoadingReport(false);
    if(!data)return;
    const report:ReportData={...meta,...data};
    if(forCompare){setCompareReport(report);}
    else{
      setActiveReport(report);setCompareReport(null);setCompareMode(false);
      const groups:Record<string,boolean>={};
      data.ads.forEach(a=>{groups[a.group]=true;});setExpandedGroups(groups);
    }
  };

  const handleFile=async(text:string,fileName:string)=>{
    const{headers,rows}=parseCSV(text);
    const colMap=detectColumns(headers);const ads=convertRows(rows,colMap);
    const start=ads.find(a=>a.startDate)?.startDate??"";
    const end=ads.find(a=>a.endDate)?.endDate??"";
    const period=start&&end?`${start} – ${end}`:fileName.replace(".csv","");
    const missing=(["spend","impressions","messages","cpm","ctr"] as (keyof ColumnMap)[])
      .filter(k=>colMap[k]===undefined)
      .map(k=>({spend:"ยอดใช้จ่าย",impressions:"Impressions",messages:"Messages",cpm:"CPM",ctr:"CTR"}[k]??k));
    setMissingCols(missing);
    setSaving(true);
    const id=await sbSaveReport({period_label:period,start_date:start,end_date:end,file_name:fileName,uploaded_by:currentUser?.full_name??"unknown",rows_json:ads,col_map:colMap});
    setSaving(false);
    const newList=await sbLoadReports();setReports(newList);
    if(id){
      const meta=newList.find(r=>r.id===id);
      if(meta){
        const report:ReportData={...meta,ads,colMap};
        setActiveReport(report);setCompareReport(null);setCompareMode(false);
        const groups:Record<string,boolean>={};ads.forEach(a=>{groups[a.group]=true;});setExpandedGroups(groups);
      }
    }
  };

  const handleDelete=async(id:string)=>{
    await sbDeleteReport(id);const newList=await sbLoadReports();setReports(newList);
    if(activeReport?.id===id)setActiveReport(null);
    if(compareReport?.id===id)setCompareReport(null);
    setDeleteConfirm(null);
  };

  const toggleGroup=(g:string)=>setExpandedGroups(prev=>({...prev,[g]:!prev[g]}));

  const ads=activeReport?.ads??[];
  const cm=activeReport?.colMap??{};
  const filteredAds=filterStatus==="all"?ads:ads.filter(a=>a.status.toLowerCase()===filterStatus);
  const totalSpend=sumN(ads,"spend");

  // Build group entries + assign colors
  const groupEntries=Object.entries(
    filteredAds.reduce<Record<string,AdRow[]>>((acc,ad)=>{if(!acc[ad.group])acc[ad.group]=[];acc[ad.group].push(ad);return acc;},{})
  ).filter(([g])=>{
    if(activeGroupFilter&&g!==activeGroupFilter)return false;
    if(searchQuery&&!g.toLowerCase().includes(searchQuery.toLowerCase()))return false;
    return true;
  }).sort(([,a],[,b])=>{
    if(sortBy==="messages")return sumN(b,"messages")-sumN(a,"messages");
    if(sortBy==="ctr"){const aV=avgN(a,"ctr")??-1,bV=avgN(b,"ctr")??-1;return bV-aV;}
    if(sortBy==="cpm"){const aV=avgN(a,"cpm")??Infinity,bV=avgN(b,"cpm")??Infinity;return aV-bV;}
    return sumN(b,"spend")-sumN(a,"spend");
  });

  // Compare group map — group name → AdRow[] from compare period
  const compareGroupMap:Record<string,AdRow[]>=useMemo(()=>{
    if(!compareReport)return{};
    return compareReport.ads.reduce<Record<string,AdRow[]>>((acc,ad)=>{
      if(!acc[ad.group])acc[ad.group]=[];acc[ad.group].push(ad);return acc;
    },{});
  },[compareReport]);

  // Stable color map for all ads (not just filtered)
  const groupColorMap:Record<string,string>=Object.keys(
    ads.reduce<Record<string,boolean>>((acc,ad)=>{acc[ad.group]=true;return acc;},{})
  ).reduce<Record<string,string>>((acc,name,i)=>{acc[name]=groupColor(i);return acc;},{});

  return(
    <>
    {presentMode&&activeReport&&(
      <PresentationMode
        report={activeReport} ads={ads} cm={cm}
        groupColorMap={groupColorMap}
        onClose={()=>setPresentMode(false)}
      />
    )}
    <div className="min-h-screen bg-background" style={{backgroundImage:"radial-gradient(ellipse at 30% -10%,rgba(127,119,221,0.08) 0%,transparent 55%)"}}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.slide-up{animation:slideUp 0.35s ease-out both}`}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* Header — hero card */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="relative px-6 py-5" style={{background:"linear-gradient(135deg,rgba(127,119,221,0.10) 0%,rgba(55,138,221,0.06) 100%)"}}>
            {/* Top gradient accent line */}
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet-500 via-blue-400 to-transparent"/>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{background:"rgba(127,119,221,0.18)"}}>
                  <TrendingUp className="w-5 h-5 text-violet-400"/>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Meta Ads Report</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {SUPABASE_ENABLED?"Cloud sync · ทีม Marketing เห็นข้อมูลเดียวกัน":"บันทึก report ลง localStorage"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saving&&<span className="flex items-center gap-1.5 text-xs text-violet-400"><Loader2 className="w-3.5 h-3.5 animate-spin"/>กำลังบันทึก...</span>}
                {activeReport&&(
                  <button onClick={()=>setPresentMode(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-violet-600 hover:bg-violet-500 text-white border border-violet-500">
                    <Monitor className="w-4 h-4"/>Present
                  </button>
                )}
                <UploadZone onFile={handleFile} compact/>
              </div>
            </div>
            {activeReport&&(
              <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{background:"rgba(127,119,221,0.15)",color:"#a5a1ee",border:"1px solid rgba(127,119,221,0.25)"}}>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>
                  {activeReport.period_label}
                </span>
                {cm.spend!==undefined&&<span className="text-xs text-muted-foreground">ยอดรวม <b className="text-foreground">฿{fmtB(totalSpend)}</b></span>}
                <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                  {ads.filter(a=>a.status.toLowerCase()==="active").length} active
                </span>
                <span className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">{ads.length} โฆษณา</span>
                <span className="text-xs text-muted-foreground ml-auto">โดย {activeReport.uploaded_by??"—"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Saved Reports panel */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CloudUpload className="w-3.5 h-3.5"/> Saved Reports
              {loadingList&&<Loader2 className="w-3 h-3 animate-spin"/>}
            </span>
            {compareMode&&compareReport&&(
              <button onClick={()=>{setCompareMode(false);setCompareReport(null);}}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-3 h-3"/> ยกเลิกเปรียบเทียบ
              </button>
            )}
          </div>
          {reports.length===0&&!loadingList&&(
            <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มี report — กด "Upload Report" เพื่อเริ่มต้น</p>
          )}
          <div className="flex flex-wrap gap-2">
            {reports.map(r=>{
              const isActive=activeReport?.id===r.id;
              const isCompare=compareReport?.id===r.id;
              return(
                <div key={r.id} className="flex items-center gap-0.5 group">
                  <button onClick={()=>{
                    if(compareMode&&activeReport&&activeReport.id!==r.id)selectReport(r,true);
                    else selectReport(r,false);
                  }} disabled={loadingReport}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border
                      ${isActive?"bg-violet-600 border-violet-600 text-white":isCompare?"bg-blue-600 border-blue-600 text-white":"bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <FileText className="w-3 h-3"/>
                    <span>{r.period_label}</span>
                  </button>
                  {deleteConfirm===r.id?(
                    <div className="flex items-center gap-1 ml-1">
                      <button onClick={()=>handleDelete(r.id)} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/30 transition-colors">ลบ</button>
                      <button onClick={()=>setDeleteConfirm(null)} className="text-[10px] bg-muted text-muted-foreground px-2 py-1 rounded-lg transition-colors">ยกเลิก</button>
                    </div>
                  ):(
                    <button onClick={()=>setDeleteConfirm(r.id)}
                      className="w-6 h-6 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all ml-0.5">
                      <Trash2 className="w-3 h-3"/>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {activeReport&&reports.length>=2&&(
            <div className="border-t border-border/40 pt-3">
              <button onClick={()=>setCompareMode(v=>!v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${compareMode?"bg-blue-600/20 text-blue-400 border border-blue-600/30":"bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border"}`}>
                <GitCompare className="w-3.5 h-3.5"/>
                {compareMode?"กำลังเลือก period เปรียบเทียบ — คลิก chip ด้านบน":"เปรียบเทียบ 2 Period"}
              </button>
            </div>
          )}
        </div>

        {loadingReport&&(
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400"/>
            <span className="text-sm">กำลังโหลดข้อมูล...</span>
          </div>
        )}

        {!loadingList&&!loadingReport&&reports.length===0&&(
          <div className="space-y-4">
            <UploadZone onFile={handleFile}/>
            <div className="rounded-2xl border bg-muted/20 p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/>
              <div className="space-y-1">
                <p className="text-sm font-medium">วิธี Export CSV จาก Meta Ads Manager</p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>เปิด Meta Ads Manager → เลือกระดับ Campaign / Ad Set / Ad</li>
                  <li>กด "Export" → เลือก "Export Table Data (CSV)"</li>
                  <li>เลือก Columns ที่ต้องการแล้ว Download</li>
                  <li>นำไฟล์ .csv มาอัปโหลดที่นี่</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {!loadingList&&!loadingReport&&reports.length>0&&!activeReport&&(
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-2">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground/30"/>
            <p className="text-sm">เลือก report ด้านบนเพื่อดูข้อมูล หรืออัปโหลด CSV ใหม่</p>
          </div>
        )}

        {/* ── Active Report ── */}
        {activeReport&&!loadingReport&&(
          <>
            {compareMode&&compareReport&&<ComparePanel a={activeReport} b={compareReport}/>}

            {missingCols.length>0&&(
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5"/>
                <p className="text-xs text-amber-300">ไม่พบ Column: <b>{missingCols.join(", ")}</b> — ระบบแสดงเฉพาะข้อมูลที่มี</p>
              </div>
            )}


            {/* ① KPI Cards — horizontal scroll on mobile, grid on desktop */}
            <div className="-mx-4 sm:mx-0">
              <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto px-4 sm:px-0 pb-1 sm:pb-0 snap-x snap-mandatory sm:overflow-visible scroll-smooth">
                {[
                  {label:"ยอดใช้จ่าย (฿)",num:sumN(ads,"spend"),prefix:"฿",decimals:2,cmp:compareReport?sumN(compareReport.ads,"spend"):undefined,icon:<DollarSign className="w-4 h-4 sm:w-5 sm:h-5"/>,color:"#7F77DD",avail:cm.spend!==undefined,hib:false},
                  {label:"Impressions",num:sumN(ads,"impressions"),prefix:"",decimals:0,cmp:compareReport?sumN(compareReport.ads,"impressions"):undefined,icon:<Eye className="w-4 h-4 sm:w-5 sm:h-5"/>,color:"#378ADD",avail:cm.impressions!==undefined,hib:true},
                  {label:"Reach",num:sumN(ads,"reach"),prefix:"",decimals:0,cmp:compareReport?sumN(compareReport.ads,"reach"):undefined,icon:<Users className="w-4 h-4 sm:w-5 sm:h-5"/>,color:"#1D9E75",avail:cm.reach!==undefined,hib:true},
                  {label:"Messages",num:sumN(ads,"messages"),prefix:"",decimals:0,cmp:compareReport?sumN(compareReport.ads,"messages"):undefined,icon:<MessageCircle className="w-4 h-4 sm:w-5 sm:h-5"/>,color:"#5DCAA5",avail:cm.messages!==undefined,hib:true},
                  {label:"CPM เฉลี่ย (฿)",num:avgN(ads,"cpm")??0,prefix:"฿",decimals:2,cmp:compareReport?(avgN(compareReport.ads,"cpm")??undefined):undefined,icon:<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5"/>,color:"#EF9F27",avail:cm.cpm!==undefined,hib:false},
                  {label:"CTR เฉลี่ย",num:avgN(ads,"ctr")??0,prefix:"",suffix:"%",decimals:2,cmp:compareReport?(avgN(compareReport.ads,"ctr")??undefined):undefined,icon:<MousePointerClick className="w-4 h-4 sm:w-5 sm:h-5"/>,color:"#D4537E",avail:cm.ctr!==undefined,hib:true},
                ].map(({label,num,prefix,suffix,decimals,cmp,icon,color,avail,hib})=>(
                  <div key={label} className="min-w-[140px] sm:min-w-0 snap-start shrink-0 sm:shrink">
                    <KPICard label={label} numericValue={num} prefix={prefix} suffix={suffix??""} decimals={decimals}
                      compareValue={compareMode&&compareReport?cmp:undefined}
                      icon={icon} accentColor={color} available={avail} higherIsBetter={hib}/>
                  </div>
                ))}
              </div>
            </div>

            {/* ② Ad Health Score */}
            <AdHealthScore ads={ads} colMap={cm}/>

            {/* ③ Charts */}
            <ChartSection ads={ads} colMap={cm} groupColorMap={groupColorMap}
              onGroupClick={g=>setActiveGroupFilter(prev=>prev===g?null:g)}
              activeGroupFilter={activeGroupFilter}/>

            {/* Top Performers — click to filter */}
            <TopPerformers ads={ads} groupColorMap={groupColorMap}
              onGroupClick={g=>setActiveGroupFilter(prev=>prev===g?null:g)}
              activeGroupFilter={activeGroupFilter}/>

            {/* Filter + Sort + Search */}
            <div className="rounded-2xl border bg-card p-3 space-y-2.5">
              {/* Row 1: status filter + search */}
              <div className="flex items-center gap-2 flex-wrap">
                {(["all","active","not_delivering","archived"] as const).map(s=>{
                  const labels={all:`ทั้งหมด (${ads.length})`,active:`Active (${ads.filter(a=>a.status.toLowerCase()==="active").length})`,not_delivering:`Paused (${ads.filter(a=>a.status.toLowerCase()==="not_delivering").length})`,archived:`Archived (${ads.filter(a=>a.status.toLowerCase()==="archived").length})`};
                  return<button key={s} onClick={()=>setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterStatus===s?"bg-violet-600 text-white":"bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}>
                    {labels[s]}</button>;
                })}
                <div className="ml-auto flex items-center gap-1.5 bg-muted/60 rounded-xl px-3 py-1.5">
                  <Search className="w-3 h-3 text-muted-foreground shrink-0"/>
                  <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                    placeholder="ค้นหากลุ่มโฆษณา..."
                    className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none w-32"/>
                  {searchQuery&&<button onClick={()=>setSearchQuery("")}><X className="w-3 h-3 text-muted-foreground"/></button>}
                </div>
              </div>
              {/* Row 2: sort + active filter clear + expand/collapse */}
              <div className="flex items-center gap-2 border-t border-border/40 pt-2.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <SlidersHorizontal className="w-3 h-3"/> เรียง:
                </span>
                {([
                  {key:"spend" as const,label:"Spend"},
                  {key:"messages" as const,label:"Messages",avail:cm.messages!==undefined},
                  {key:"ctr" as const,label:"CTR ↑",avail:cm.ctr!==undefined},
                  {key:"cpm" as const,label:"CPM ↓",avail:cm.cpm!==undefined},
                ] as {key:"spend"|"messages"|"ctr"|"cpm";label:string;avail?:boolean}[]).map(({key,label,avail=true})=>(
                  <button key={key} onClick={()=>avail&&setSortBy(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${!avail?"opacity-30 cursor-not-allowed":""} ${sortBy===key?"text-white":"bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    style={sortBy===key?{background:"rgba(127,119,221,0.8)"}:{}}>
                    {label}
                  </button>
                ))}
                {activeGroupFilter&&(
                  <button onClick={()=>setActiveGroupFilter(null)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors">
                    <X className="w-3 h-3"/> {activeGroupFilter}
                  </button>
                )}
                <div className="ml-auto flex gap-1">
                  <button onClick={()=>setExpandedGroups(Object.fromEntries(groupEntries.map(([g])=>[g,true])))}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">ขยายทั้งหมด</button>
                  <button onClick={()=>setExpandedGroups(Object.fromEntries(groupEntries.map(([g])=>[g,false])))}
                    className="px-2.5 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">ย่อทั้งหมด</button>
                </div>
              </div>
            </div>

            {/* ③ Group Cards */}
            <div className="space-y-3">
              {groupEntries.length===0
                ?<div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground text-sm">ไม่มีโฆษณาในสถานะนี้</div>
                :groupEntries.map(([g,gAds],i)=>(
                  <div key={g} className="slide-up" style={{animationDelay:`${i*45}ms`}}>
                    <GroupCard groupName={g} ads={gAds} cm={cm}
                      expanded={expandedGroups[g]??false} onToggle={()=>toggleGroup(g)}
                      color={groupColorMap[g]??groupColor(0)} totalSpend={totalSpend}
                      compareAds={compareMode&&compareReport?compareGroupMap[g]:undefined}/>
                  </div>
                ))
              }
            </div>

            {/* ④ Insight cards */}
            <InsightForm period={activeReport.period_label}/>
          </>
        )}
      </div>
    </div>
    </>
  );
}

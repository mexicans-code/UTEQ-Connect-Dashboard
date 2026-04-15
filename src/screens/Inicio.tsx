import React, { useState, useEffect, useMemo } from "react";
import {
  Users, MapPin, Calendar, UserCheck, Activity,
  TrendingUp, CalendarCheck, BarChart3, Clock,
  CheckCircle2, XCircle, Building2,
  ArrowUpRight, Layers, Zap, ShieldCheck, LayoutGrid,
} from "lucide-react";
import "../styles/Inicio.css";
import "../styles/tabla.css";

import { getUsuarios, type Usuario } from "../api/users";
import { getLocations } from "../api/locations";
import { getEventos, type Evento } from "../api/events";
import { getPersonal } from "../api/personal";
import { getEspacios, type Espacio } from "../api/espacios";
import { getMetricasEventos, type EventoStats } from "../api/reportes";
import { getInvitacionesStats } from "../api/invitaciones";
import { getLogs, type Log } from "../api/logs";
import { exportReportesPDF, exportMetricasEventosPDF } from "../utils/pdfExport";
import NavSidebar from "./components/NavSidebar";
import PageTopbar from "./components/PageTopbar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, Area, AreaChart,
} from "recharts";

const COLORS_PIE = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];
const getNombreDest = (d: any) => (!d ? "—" : typeof d === "string" ? d : d.nombre);

interface MiEventoStat {
  eventoId: string; titulo: string;
  aceptadas: number; asistencias: number; noAsistio: number; pendientes: number; total: number;
}
interface EspaciosPorEdificio {
  edificioId: string; edificioNombre: string; total: number; libres: number; ocupados: number;
}

const Inicio: React.FC = () => {
  const ROL_ACTUAL   = (localStorage.getItem("rol") ?? "admin") as "admin" | "superadmin";
  const esSuperAdmin = ROL_ACTUAL === "superadmin";
  const nombre       = localStorage.getItem("nombre") || (esSuperAdmin ? "Super Admin" : "Admin");
  const userIdActual = localStorage.getItem("userId") || "";

  const [usuarios,  setUsuarios]  = useState<Usuario[]>([]);
  const [eventos,   setEventos]   = useState<Evento[]>([]);
  const [edificios, setEdificios] = useState<any[]>([]);
  const [personal,  setPersonal]  = useState<any[]>([]);
  const [stats,     setStats]     = useState<EventoStats[]>([]);
  const [logs,      setLogs]      = useState<Log[]>([]);
  const [espacios,  setEspacios]  = useState<Espacio[]>([]);
  const [misStats,  setMisStats]  = useState<MiEventoStat[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [loadingMisStats, setLoadingMisStats] = useState(true);

  /* ── Carga superadmin ── */
  useEffect(() => {
    if (!esSuperAdmin) return;
    (async () => {
      try {
        const [u, loc, ev, pers, met, lg, esp] = await Promise.all([
          getUsuarios(), getLocations(), getEventos(),
          getPersonal(), getMetricasEventos(), getLogs(), getEspacios(),
        ]);
        setUsuarios(u); setEdificios(loc); setEventos(ev as Evento[]);
        setPersonal(pers); setStats(met); setLogs(lg.slice(0,50)); setEspacios(esp);
      } catch {} finally { setLoading(false); }
    })();
  }, [esSuperAdmin]);

  /* ── Carga admin ── */
  useEffect(() => {
    if (esSuperAdmin) return;
    (async () => {
      try {
        const [ev, pers, u, esp, loc] = await Promise.all([
          getEventos(), getPersonal(), getUsuarios(), getEspacios(), getLocations(),
        ]);
        setEventos(ev as Evento[]); setPersonal(pers); setUsuarios(u);
        setEspacios(esp); setEdificios(loc);
      } catch {} finally { setLoading(false); }
    })();
    (async () => {
      setLoadingMisStats(true);
      try {
        const todosEventos = await getEventos();
        const misEventos = (todosEventos as Evento[]).filter((ev: any) => {
          if (!ev.creadoPor) return false;
          const cId = typeof ev.creadoPor === "object" ? (ev.creadoPor as any)._id : ev.creadoPor;
          return cId === userIdActual;
        });
        const resultados = await Promise.all(misEventos.map(async (ev: any) => {
          try {
            const s = await getInvitacionesStats(ev._id);
            return { eventoId:ev._id, titulo:ev.titulo, aceptadas:s.aceptadas??0,
              asistencias:s.asistencias??0, noAsistio:s.noAsistio??0, pendientes:s.pendientes??0,
              total:(s.aceptadas??0)+((s as any).enviadas??0)+((s as any).rechazadas??0) };
          } catch { return {eventoId:ev._id,titulo:ev.titulo,aceptadas:0,asistencias:0,noAsistio:0,pendientes:0,total:0}; }
        }));
        setMisStats(resultados);
      } catch {} finally { setLoadingMisStats(false); }
    })();
  }, [esSuperAdmin, userIdActual]);

  /* ── Derivados comunes ── */
  const hoy      = new Date();
  const todayStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;

  const eventosActivos   = useMemo(() => eventos.filter(e => e.activo), [eventos]);
  const eventosHoy       = useMemo(() => eventos.filter(e => e.fecha?.slice(0,10) === todayStr), [eventos, todayStr]);
  const eventosProximos  = useMemo(() =>
    eventos.filter(e => e.activo && e.fecha?.slice(0,10) >= todayStr)
      .sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,6), [eventos, todayStr]);

  const usuariosActivos  = useMemo(() => usuarios.filter(u => u.estatus === "activo" || (u.estatus as any) === "active"), [usuarios]);
  const usuariosAdmin    = useMemo(() => usuarios.filter(u => u.rol === "admin"), [usuarios]);
  const usuariosNormales = useMemo(() => usuarios.filter(u => u.rol !== "admin" && u.rol !== "superadmin"), [usuarios]);
  const totalInscritos   = useMemo(() => stats.reduce((a,s) => a+s.total, 0), [stats]);
  const totalAsistencias = useMemo(() => stats.reduce((a,s) => a+s.asistencias, 0), [stats]);
  const pctAsistencia    = totalInscritos > 0 ? Math.round((totalAsistencias/totalInscritos)*100) : 0;
  const ocupacionPromedio = useMemo(() => {
    const con = eventos.filter(e => e.cupos > 0);
    if (!con.length) return 0;
    return Math.round((con.reduce((a,e) => a+((e.cupos-e.cuposDisponibles)/e.cupos), 0)/con.length)*100);
  }, [eventos]);

  const espaciosPorEdificio = useMemo((): EspaciosPorEdificio[] => {
    const mapa: Record<string, EspaciosPorEdificio> = {};
    edificios.forEach(e => { mapa[e._id] = {edificioId:e._id,edificioNombre:e.nombre,total:0,libres:0,ocupados:0}; });
    espacios.forEach(esp => {
      const dId = typeof esp.destino === "object" ? esp.destino?._id : esp.destino;
      if (dId && mapa[dId]) { mapa[dId].total++; if (esp.ocupado) mapa[dId].ocupados++; else mapa[dId].libres++; }
    });
    return Object.values(mapa).filter(e => e.total > 0).sort((a,b) => b.total-a.total);
  }, [edificios, espacios]);

  /* ── Derivados admin ── */
  const misEventos = useMemo(() => eventos.filter((ev:any) => {
    if (!ev.creadoPor) return false;
    const cId = typeof ev.creadoPor === "object" ? (ev.creadoPor as any)._id : ev.creadoPor;
    return cId === userIdActual;
  }), [eventos, userIdActual]);

  const misEventosProximos = useMemo(() =>
    misEventos.filter(e => e.activo && e.fecha?.slice(0,10) >= todayStr)
      .sort((a,b) => a.fecha.localeCompare(b.fecha)).slice(0,5), [misEventos, todayStr]);

  const misTotalesInscritos   = useMemo(() => misStats.reduce((a,s) => a+s.aceptadas, 0), [misStats]);
  const misTotalesAsistencias = useMemo(() => misStats.reduce((a,s) => a+s.asistencias, 0), [misStats]);
  const misPctAsistencia = misTotalesInscritos > 0 ? Math.round((misTotalesAsistencias/misTotalesInscritos)*100) : 0;

  /* ── Datos gráficas superadmin ── */
  const dataRoles         = [{name:"Alumnos/Staff",value:usuariosNormales.length},{name:"Admins",value:usuariosAdmin.length}].filter(d=>d.value>0);
  const dataEventosEstado = [{name:"Activos",value:eventosActivos.length},{name:"Inactivos",value:eventos.length-eventosActivos.length}].filter(d=>d.value>0);
  const dataTopEventos    = [...stats].sort((a,b)=>b.total-a.total).slice(0,6).map(s=>({nombre:s.titulo.length>16?s.titulo.slice(0,16)+"…":s.titulo,Inscritos:s.total,Asistieron:s.asistencias}));
  const dataAsistencia    = stats.filter(s=>s.total>0).slice(0,8).map(s=>({nombre:s.titulo.length>14?s.titulo.slice(0,14)+"…":s.titulo,pct:Math.round((s.asistencias/s.total)*100)}));
  const dataEspacios      = espaciosPorEdificio.map(e=>({name:e.edificioNombre.length>14?e.edificioNombre.slice(0,14)+"…":e.edificioNombre,Libres:e.libres,Ocupados:e.ocupados}));
  const misChartData      = misStats.map(s=>({nombre:s.titulo.length>16?s.titulo.slice(0,16)+"…":s.titulo,Registrados:s.aceptadas,Asistieron:s.asistencias}));

  /* ── Loading ── */
  if (loading) return (
    <div className={esSuperAdmin?"spadmin-container":"admin-container"}>
      <NavSidebar rol={ROL_ACTUAL}/>
      <div className={esSuperAdmin?"spadmin-main-content":"main-content"}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,color:"var(--gray-400)",fontSize:"0.9rem"}}>Cargando panel…</div>
      </div>
    </div>
  );

  /* ════════════════════════════════════
     SUPERADMIN
  ════════════════════════════════════ */
  if (esSuperAdmin) return (
    <div className="spadmin-container">
      <NavSidebar rol="superadmin"/>
      <div className="spadmin-main-content">
        <PageTopbar title={`Bienvenido, ${nombre}`} subtitle="Panel de Super Administrador — resumen del sistema"
          onDownloadPDF={()=>exportReportesPDF({usuarios:usuarios.length,edificios:edificios.length,eventos:eventos.length,eventosActivos:eventosActivos.length,eventosInactivos:eventos.length-eventosActivos.length,personal:personal.length})}/>
        <div className="spadmin-content-area">

          {/* KPIs */}
          <div className="sp-kpi-grid">
            {[
              {icon:<Users size={20}/>,        label:"Usuarios",        val:usuarios.length,    sub:`${usuariosActivos.length} activos`,                                  color:"#2563eb",bg:"#dbeafe",trend:null as null|number},
              {icon:<Building2 size={20}/>,    label:"Edificios",       val:edificios.length,   sub:"ubicaciones registradas",                                            color:"#7c3aed",bg:"#ede9fe",trend:null},
              {icon:<LayoutGrid size={20}/>,   label:"Espacios",        val:espacios.length,    sub:`${espaciosPorEdificio.reduce((a,e)=>a+e.libres,0)} libres`,           color:"#0891b2",bg:"#cffafe",trend:null},
              {icon:<Calendar size={20}/>,     label:"Eventos totales", val:eventos.length,     sub:`${eventosActivos.length} activos`,                                   color:"#d97706",bg:"#fef9c3",trend:null},
              {icon:<CalendarCheck size={20}/>,label:"Eventos hoy",     val:eventosHoy.length,  sub:"programados para hoy",                                               color:"#16a34a",bg:"#dcfce7",trend:null},
              {icon:<UserCheck size={20}/>,    label:"Personal",        val:personal.length,    sub:"miembros del staff",                                                 color:"#be185d",bg:"#fce7f3",trend:null},
              {icon:<TrendingUp size={20}/>,   label:"% Asistencia",   val:`${pctAsistencia}%`,sub:`${totalAsistencias} de ${totalInscritos}`,                           color:"#16a34a",bg:"#dcfce7",trend:pctAsistencia},
            ].map(k=>(
              <div key={k.label} className="sp-kpi-card">
                <div className="sp-kpi-icon" style={{background:k.bg,color:k.color}}>{k.icon}</div>
                <div className="sp-kpi-body">
                  <p className="sp-kpi-val">{k.val}</p>
                  <p className="sp-kpi-label">{k.label}</p>
                  <p className="sp-kpi-sub">{k.sub}</p>
                </div>
                {k.trend!==null&&<div className="sp-kpi-trend" style={{color:k.trend>=60?"#16a34a":k.trend>=30?"#d97706":"#dc2626"}}><ArrowUpRight size={14}/></div>}
              </div>
            ))}
          </div>

          {/* Fila 1: Próximos eventos + Logs */}
          <div className="sp-row-2col">
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#dbeafe",color:"#2563eb"}}><Calendar size={16}/></span><h3>Próximos Eventos</h3><span className="sp-panel-badge">{eventosProximos.length}</span></div>
              {eventosProximos.length===0?<div className="sp-empty"><Calendar size={28}/><p>Sin eventos próximos</p></div>:(
                <div className="sp-evento-list">
                  {eventosProximos.map(ev=>{
                    const pct=ev.cupos>0?Math.round(((ev.cupos-ev.cuposDisponibles)/ev.cupos)*100):0;
                    const esHoy=ev.fecha?.slice(0,10)===todayStr;
                    return(
                      <div key={ev._id} className="sp-evento-item">
                        <div className="sp-evento-fecha">
                          <span className="sp-evento-dia">{new Date(ev.fecha.slice(0,10)+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit"})}</span>
                          <span className="sp-evento-mes">{new Date(ev.fecha.slice(0,10)+"T12:00:00").toLocaleDateString("es-MX",{month:"short"})}</span>
                        </div>
                        <div className="sp-evento-info">
                          <p className="sp-evento-titulo">{ev.titulo}{esHoy&&<span className="sp-badge-hoy">Hoy</span>}</p>
                          <p className="sp-evento-meta"><Clock size={11}/> {ev.horaInicio}–{ev.horaFin} <MapPin size={11}/> {getNombreDest(ev.destino)}</p>
                          <div className="sp-evento-bar"><div className="sp-evento-bar-fill" style={{width:`${pct}%`,background:pct>80?"#dc2626":pct>50?"#d97706":"#2563eb"}}/></div>
                          <p className="sp-evento-cupos">{ev.cuposDisponibles}/{ev.cupos} cupos disponibles</p>
                        </div>
                        <div className={`sp-evento-estado ${ev.activo?"activo":"inactivo"}`}>{ev.activo?<CheckCircle2 size={14}/>:<XCircle size={14}/>}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#fef9c3",color:"#d97706"}}><Activity size={16}/></span><h3>Actividad del Sistema</h3><span className="sp-panel-badge">{logs.length}</span></div>
              {logs.length===0?<div className="sp-empty"><Zap size={28}/><p>Sin actividad registrada</p></div>:(
                <div className="sp-log-list">
                  {logs.slice(0,8).map(log=>(
                    <div key={log._id} className={`sp-log-item sp-log-${log.nivel}`}>
                      <span className="sp-log-dot"/>
                      <div className="sp-log-body"><p className="sp-log-evento">{log.evento}</p><p className="sp-log-meta">{log.metodo} {log.ruta} · {log.statusCode}</p></div>
                      <span className={`sp-log-badge sp-log-badge-${log.nivel}`}>{log.nivel}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: Eventos por inscritos + Usuarios */}
          <div className="sp-row-2col">
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#dcfce7",color:"#16a34a"}}><BarChart3 size={16}/></span><h3>Eventos por Inscritos</h3></div>
              {dataTopEventos.length===0?<div className="sp-empty"><BarChart3 size={28}/><p>Sin datos</p></div>:(
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dataTopEventos} margin={{top:4,right:8,left:-10,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="nombre" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/>
                    <Tooltip contentStyle={{fontSize:12,borderRadius:8}}/><Legend wrapperStyle={{fontSize:12}}/>
                    <Bar dataKey="Inscritos" fill="#3b82f6" radius={[4,4,0,0]}/><Bar dataKey="Asistieron" fill="#10b981" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#ede9fe",color:"#7c3aed"}}><Users size={16}/></span><h3>Distribución de Usuarios</h3></div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart><Pie data={dataRoles} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>{dataRoles.map((_,i)=><Cell key={i} fill={COLORS_PIE[i]}/>)}</Pie><Tooltip contentStyle={{fontSize:12,borderRadius:8}}/></PieChart>
                </ResponsiveContainer>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                  {dataRoles.map((d,i)=>(
                    <div key={d.name} style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:COLORS_PIE[i],flexShrink:0}}/>
                      <div><p style={{margin:0,fontSize:"0.82rem",fontWeight:600,color:"var(--text-primary)"}}>{d.value}</p><p style={{margin:0,fontSize:"0.74rem",color:"var(--text-muted)"}}>{d.name}</p></div>
                    </div>
                  ))}
                  <div style={{marginTop:4,paddingTop:8,borderTop:"1px solid var(--border)"}}>
                    <p style={{margin:0,fontSize:"0.74rem",color:"var(--text-muted)"}}>Total</p>
                    <p style={{margin:0,fontSize:"1rem",fontWeight:700,color:"var(--text-primary)"}}>{usuarios.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 3: % Asistencia + Estado eventos */}
          <div className="sp-row-2col">
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#cffafe",color:"#0891b2"}}><TrendingUp size={16}/></span><h3>% Asistencia por Evento</h3></div>
              {dataAsistencia.length===0?<div className="sp-empty"><TrendingUp size={28}/><p>Sin datos</p></div>:(
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dataAsistencia} margin={{top:4,right:8,left:-10,bottom:0}}>
                    <defs><linearGradient id="gradPct" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0891b2" stopOpacity={0.25}/><stop offset="95%" stopColor="#0891b2" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="nombre" tick={{fontSize:11}}/><YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:11}}/>
                    <Tooltip formatter={(v:any)=>[`${v}%`,"Asistencia"]} contentStyle={{fontSize:12,borderRadius:8}}/>
                    <Area type="monotone" dataKey="pct" stroke="#0891b2" strokeWidth={2} fill="url(#gradPct)" dot={{r:4,fill:"#0891b2"}}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#fef9c3",color:"#d97706"}}><Layers size={16}/></span><h3>Estado de Eventos</h3></div>
              <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
                <ResponsiveContainer width="45%" height={170}><PieChart><Pie data={dataEventosEstado} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={3}>{dataEventosEstado.map((_,i)=><Cell key={i} fill={["#2563eb","#94a3b8"][i]}/>)}</Pie><Tooltip contentStyle={{fontSize:12,borderRadius:8}}/><Legend wrapperStyle={{fontSize:11}}/></PieChart></ResponsiveContainer>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,paddingTop:8}}>
                  {[{label:"Total",val:eventos.length,color:"var(--text-primary)"},{label:"Activos",val:eventosActivos.length,color:"#16a34a"},{label:"Inactivos",val:eventos.length-eventosActivos.length,color:"#94a3b8"},{label:"Hoy",val:eventosHoy.length,color:"#d97706"},{label:"Ocupación",val:`${ocupacionPromedio}%`,color:"#2563eb"}].map(r=>(
                    <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:"1px solid var(--border)"}}>
                      <span style={{fontSize:"0.8rem",color:"var(--text-muted)"}}>{r.label}</span>
                      <span style={{fontSize:"0.875rem",fontWeight:700,color:r.color}}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Fila 4: Resumen general + Espacios por edificio */}
          <div className="sp-row-2col">
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#dbeafe",color:"#2563eb"}}><BarChart3 size={16}/></span><h3>Resumen General</h3></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{name:"Usuarios",total:usuarios.length},{name:"Edificios",total:edificios.length},{name:"Espacios",total:espacios.length},{name:"Eventos",total:eventos.length},{name:"Personal",total:personal.length}]} margin={{top:4,right:8,left:-10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/>
                  <Tooltip contentStyle={{fontSize:12,borderRadius:8}}/><Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="sp-panel">
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#cffafe",color:"#0891b2"}}><LayoutGrid size={16}/></span><h3>Espacios por Edificio</h3><span className="sp-panel-badge">{espacios.length} totales</span></div>
              {dataEspacios.length===0?<div className="sp-empty"><LayoutGrid size={28}/><p>Sin espacios registrados</p></div>:(
                <ResponsiveContainer width="100%" height={Math.max(180,dataEspacios.length*38)}>
                  <BarChart data={dataEspacios} layout="vertical" margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis type="number" allowDecimals={false} tick={{fontSize:11}}/><YAxis type="category" dataKey="name" width={110} tick={{fontSize:11}}/>
                    <Tooltip contentStyle={{fontSize:12,borderRadius:8}}/><Legend wrapperStyle={{fontSize:12}}/>
                    <Bar dataKey="Libres" fill="#10b981" stackId="a"/><Bar dataKey="Ocupados" fill="#f59e0b" stackId="a" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tabla detalle espacios */}
          {espaciosPorEdificio.length>0&&(
            <div className="sp-panel" style={{marginBottom:8}}>
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#cffafe",color:"#0891b2"}}><LayoutGrid size={16}/></span><h3>Detalle de Espacios por Edificio</h3></div>
              <div className="ut-table-wrapper"><table className="ut-table">
                <thead><tr><th>Edificio</th><th className="ut-col-num">Total</th><th className="ut-col-num">Libres</th><th className="ut-col-num">Ocupados</th><th className="ut-col-num">% Ocupación</th></tr></thead>
                <tbody>
                  {espaciosPorEdificio.map(e=>{const pct=e.total>0?Math.round((e.ocupados/e.total)*100):0;return(
                    <tr key={e.edificioId}>
                      <td style={{fontWeight:500}}>{e.edificioNombre}</td><td className="ut-col-num">{e.total}</td>
                      <td className="ut-col-num" style={{color:"#10b981",fontWeight:600}}>{e.libres}</td>
                      <td className="ut-col-num" style={{color:e.ocupados>0?"#f59e0b":"var(--gray-400)",fontWeight:e.ocupados>0?600:400}}>{e.ocupados>0?e.ocupados:"—"}</td>
                      <td className="ut-col-num"><span style={{background:pct>70?"#fee2e2":pct>40?"#fef9c3":"#dcfce7",color:pct>70?"#dc2626":pct>40?"#ca8a04":"#16a34a",padding:"2px 9px",borderRadius:8,fontSize:"0.8rem",fontWeight:600}}>{pct}%</span></td>
                    </tr>
                  );})}
                </tbody>
              </table></div>
            </div>
          )}

          {/* Tabla métricas detalladas */}
          {stats.length>0&&(
            <div className="sp-panel" style={{marginBottom:24}}>
              <div className="sp-panel-header"><span className="sp-panel-icon" style={{background:"#dbeafe",color:"#2563eb"}}><ShieldCheck size={16}/></span><h3>Métricas Detalladas por Evento</h3><span className="sp-panel-badge">{stats.length} eventos</span></div>
              <div className="ut-table-wrapper"><table className="ut-table">
                <thead><tr><th>Evento</th><th className="ut-col-num">Inscritos</th><th className="ut-col-num">Aceptados</th><th className="ut-col-num">Asistieron</th><th className="ut-col-num">No asistió</th><th className="ut-col-num">% Asistencia</th></tr></thead>
                <tbody>
                  {stats.map(s=>{const pct=s.aceptadas>0?Math.round((s.asistencias/s.aceptadas)*100):0;return(
                    <tr key={s.eventoId}>
                      <td style={{fontWeight:500}}>{s.titulo}</td>
                      <td className="ut-col-num" style={{color:s.total===0?"var(--gray-400)":"inherit"}}>{s.total===0?"—":s.total}</td>
                      <td className="ut-col-num" style={{color:s.aceptadas===0?"var(--gray-400)":"inherit"}}>{s.aceptadas===0?"—":s.aceptadas}</td>
                      <td className="ut-col-num" style={{color:s.asistencias===0?"var(--gray-400)":"#16a34a",fontWeight:s.asistencias>0?600:400}}>{s.asistencias===0?"—":s.asistencias}</td>
                      <td className="ut-col-num" style={{color:s.noAsistio===0?"var(--gray-400)":"#dc2626"}}>{s.noAsistio===0?"—":s.noAsistio}</td>
                      <td className="ut-col-num"><span style={{opacity:s.aceptadas===0?0.4:1,background:pct>=70?"#dcfce7":pct>=40?"#fef9c3":"#fee2e2",color:pct>=70?"#16a34a":pct>=40?"#d97706":"#dc2626",padding:"2px 9px",borderRadius:8,fontSize:"0.8rem",fontWeight:600}}>{pct}%</span></td>
                    </tr>
                  );})}
                </tbody>
              </table></div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════
     ADMIN
  ════════════════════════════════════ */
  return (
    <div className="admin-container">
      <NavSidebar rol="admin"/>
      <div className="main-content">
        <PageTopbar title={`Bienvenido, ${nombre}`} subtitle="Panel de Administrador — resumen y métricas de tus eventos"
          showDownload={!loadingMisStats} onDownloadPDF={()=>exportMetricasEventosPDF(misStats)}/>
        <div className="content-area">

          {/* KPIs admin */}
          <div className="adm-kpi-grid">
            {[
              {icon:<Users size={20}/>,        label:"Usuarios",        val:usuarios.length,    sub:`${usuariosActivos.length} activos`,  color:"#2563eb",bg:"#dbeafe"},
              {icon:<Building2 size={20}/>,    label:"Edificios",       val:edificios.length,   sub:"ubicaciones registradas",            color:"#7c3aed",bg:"#ede9fe"},
              {icon:<Calendar size={20}/>,     label:"Eventos totales", val:eventos.length,     sub:`${eventosActivos.length} activos`,   color:"#d97706",bg:"#fef9c3"},
              {icon:<CalendarCheck size={20}/>,label:"Eventos hoy",     val:eventosHoy.length,  sub:"programados para hoy",               color:"#16a34a",bg:"#dcfce7"},
              {icon:<UserCheck size={20}/>,    label:"Personal",        val:personal.length,    sub:"miembros del staff",                 color:"#0891b2",bg:"#cffafe"},
            ].map(k=>(
              <div key={k.label} className="adm-kpi-card">
                <div className="adm-kpi-icon" style={{background:k.bg,color:k.color}}>{k.icon}</div>
                <div className="adm-kpi-body">
                  <p className="adm-kpi-val">{k.val}</p>
                  <p className="adm-kpi-label">{k.label}</p>
                  <p className="adm-kpi-sub">{k.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fila 2 col: Mis próximos eventos + Edificios */}
          <div className="adm-row-2col">
            <div className="adm-panel">
              <div className="adm-panel-header"><span className="adm-panel-icon" style={{background:"#dbeafe",color:"#2563eb"}}><Calendar size={15}/></span><h3>Mis Próximos Eventos</h3><span className="adm-panel-badge">{misEventosProximos.length}</span></div>
              {misEventosProximos.length===0?<div className="adm-empty"><Calendar size={26}/><p>No tienes eventos próximos creados</p></div>:(
                <div className="adm-evento-list">
                  {misEventosProximos.map(ev=>{
                    const pct=ev.cupos>0?Math.round(((ev.cupos-ev.cuposDisponibles)/ev.cupos)*100):0;
                    const esHoy=ev.fecha?.slice(0,10)===todayStr;
                    return(
                      <div key={ev._id} className="adm-evento-item">
                        <div className="adm-evento-fecha">
                          <span className="adm-evento-dia">{new Date(ev.fecha.slice(0,10)+"T12:00:00").toLocaleDateString("es-MX",{day:"2-digit"})}</span>
                          <span className="adm-evento-mes">{new Date(ev.fecha.slice(0,10)+"T12:00:00").toLocaleDateString("es-MX",{month:"short"})}</span>
                        </div>
                        <div className="adm-evento-info">
                          <p className="adm-evento-titulo">{ev.titulo}{esHoy&&<span className="adm-badge-hoy">Hoy</span>}</p>
                          <p className="adm-evento-meta"><Clock size={11}/> {ev.horaInicio}–{ev.horaFin} <MapPin size={11}/> {getNombreDest(ev.destino)}</p>
                          <div className="adm-evento-bar"><div className="adm-evento-bar-fill" style={{width:`${pct}%`,background:pct>80?"#dc2626":pct>50?"#d97706":"#2563eb"}}/></div>
                          <p className="adm-evento-cupos">{ev.cuposDisponibles}/{ev.cupos} cupos disponibles</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="adm-panel">
              <div className="adm-panel-header"><span className="adm-panel-icon" style={{background:"#ede9fe",color:"#7c3aed"}}><Building2 size={15}/></span><h3>Edificios del Campus</h3><span className="adm-panel-badge">{edificios.length}</span></div>
              {edificios.length===0?<div className="adm-empty"><Building2 size={26}/><p>Sin edificios registrados</p></div>:(
                <div className="adm-edificio-list">
                  {edificios.map((ed:any)=>{
                    const esp=espaciosPorEdificio.find(e=>e.edificioId===ed._id);
                    return(
                      <div key={ed._id} className="adm-edificio-item">
                        <div className="adm-edificio-icon"><Building2 size={16}/></div>
                        <div className="adm-edificio-info">
                          <p className="adm-edificio-nombre">{ed.nombre}</p>
                          <p className="adm-edificio-sub">{esp?`${esp.total} espacios · ${esp.libres} libres · ${esp.ocupados} ocupados`:"Sin espacios registrados"}</p>
                        </div>
                        {esp&&<span className="adm-edificio-badge" style={{background:esp.ocupados===0?"#dcfce7":esp.libres===0?"#fee2e2":"#fef9c3",color:esp.ocupados===0?"#16a34a":esp.libres===0?"#dc2626":"#ca8a04"}}>{esp.ocupados===0?"Libre":esp.libres===0?"Lleno":`${esp.libres} lib.`}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Métricas de mis eventos */}
          <div className="adm-section-title"><BarChart3 size={16} style={{color:"var(--primary)"}}/> Supervisión — Mis Eventos</div>
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"9px 14px",marginBottom:18,fontSize:"0.82rem",color:"#1d4ed8",display:"flex",alignItems:"center",gap:8}}>
            <Activity size={14}/> Mostrando métricas únicamente de los eventos que creaste tú.
          </div>

          {loadingMisStats?(
            <p style={{color:"var(--gray-400)",textAlign:"center",padding:"24px 0"}}>Cargando métricas…</p>
          ):(
            <>
              <div className="met-kpi-grid" style={{marginBottom:24}}>
                {[
                  {icon:<BarChart3 size={28}/>,    val:misStats.length,         label:"Mis eventos"},
                  {icon:<Users size={28}/>,         val:misTotalesInscritos,     label:"Total registrados"},
                  {icon:<CalendarCheck size={28}/>, val:misTotalesAsistencias,   label:"Total asistencias"},
                  {icon:<TrendingUp size={28}/>,    val:`${misPctAsistencia}%`,  label:"% Asistencia gral."},
                ].map(k=>(
                  <div className="met-card" key={k.label}>{k.icon}<h3>{k.val}</h3><p>{k.label}</p></div>
                ))}
              </div>

              {misStats.length===0?(
                <div style={{background:"var(--gray-50)",border:"1px solid var(--border)",borderRadius:10,padding:"18px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:10,color:"var(--gray-500)",fontSize:"0.875rem"}}>
                  <span>Aún no has creado ningún evento. Las métricas aparecerán aquí una vez que crees eventos y los usuarios se registren.</span>
                </div>
              ):(
                <>
                  {misChartData.filter(d=>d.Registrados>0||d.Asistieron>0).length>0&&(
                    <div className="met-chart-container" style={{marginBottom:24}}>
                      <h2>Comparación por Evento</h2>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={misChartData.filter(d=>d.Registrados>0||d.Asistieron>0)} margin={{top:4,right:8,left:-10,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="nombre" tick={{fontSize:11}}/><YAxis allowDecimals={false} tick={{fontSize:11}}/>
                          <Tooltip contentStyle={{fontSize:12,borderRadius:8}}/><Legend wrapperStyle={{fontSize:12}}/>
                          <Bar dataKey="Registrados" fill="#3b82f6" radius={[4,4,0,0]}/><Bar dataKey="Asistieron" fill="#10b981" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div className="ut-table-wrapper"><table className="ut-table">
                    <thead><tr><th>Evento</th><th className="ut-col-num">Registrados</th><th className="ut-col-num">Asistieron</th><th className="ut-col-num">% Asistencia</th></tr></thead>
                    <tbody>
                      {misStats.map(s=>{const pct=s.aceptadas>0?Math.round((s.asistencias/s.aceptadas)*100):0;return(
                        <tr key={s.eventoId}>
                          <td>{s.titulo}</td>
                          <td className="ut-col-num" style={{color:s.aceptadas===0?"var(--gray-400)":"inherit"}}>{s.aceptadas===0?"—":s.aceptadas}</td>
                          <td className="ut-col-num" style={{color:s.asistencias===0?"var(--gray-400)":"inherit"}}>{s.asistencias===0?"—":s.asistencias}</td>
                          <td className="ut-col-num"><span className="ut-pct" style={{opacity:s.aceptadas===0?0.4:1}}>{pct}%</span></td>
                        </tr>
                      );})}
                    </tbody>
                  </table></div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Inicio;
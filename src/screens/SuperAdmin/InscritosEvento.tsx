import React, { useState, useEffect, useMemo, useCallback } from "react";
import "../../styles/InscritosEvento.css";
import NavSpAdmin from "../components/NavSpAdmin";
import {
    Users, Calendar, MapPin, Clock,
    CheckCircle2, XCircle, UserCheck, UserX,
    ClipboardList, Save, Download, FileText,
} from "lucide-react";
import api from "../../api/axios";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

/* ═══════════ INTERFACES ═══════════ */

interface Destino { _id: string; nombre: string; }
interface Evento {
    _id: string; titulo: string;
    fecha: string; horaInicio: string; horaFin: string;
    destino: Destino | string; cupos: number; cuposDisponibles: number; activo: boolean;
    creadoPor?: { _id: string; nombre: string; email: string } | string;
}

interface UsuarioInv { _id: string; nombre?: string; name?: string; email?: string; correo?: string; }
interface Invitacion {
    _id: string;
    usuario: UsuarioInv | string | null;
    estadoInvitacion: string;
    estadoAsistencia: string;
    fechaEnvio?: string;
}

type TabType = "inscritos" | "asistencia";
type FiltroInv = "todos" | "aceptada" | "enviada" | "rechazada";

/* ═══════════ HELPERS ═══════════ */

const formatFecha = (iso: string) => !iso ? "—"
    : new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const getNombre = (u: UsuarioInv | string | null) => {
    if (!u || typeof u === "string") return "—";
    return u.nombre || u.name || "Sin nombre";
};
const getEmail = (u: UsuarioInv | string | null) => {
    if (!u || typeof u === "string") return "—";
    return u.email || u.correo || "Sin correo";
};
const getNombreDestino = (d: Destino | string | undefined) => {
    if (!d) return "—";
    return typeof d === "string" ? d : d.nombre;
};

/* ═══════════ BADGE ═══════════ */

const BadgeInv: React.FC<{ estado: string }> = ({ estado }) => {
    const map: Record<string, string> = {
        aceptada: "aceptada", rechazada: "rechazada",
        enviada: "enviada", pendiente: "pendiente",
    };
    const labels: Record<string, string> = {
        aceptada: "Aceptada", rechazada: "Rechazada",
        enviada: "Enviada", pendiente: "Pendiente",
    };
    return <span className={`ins-badge ${map[estado] || "sin-reg"}`}>{labels[estado] || estado}</span>;
};

const BadgeAsist: React.FC<{ estado: string }> = ({ estado }) => {
    const map: Record<string, string> = {
        asistio: "asistio", "no asistio": "falta", "no_asistio": "falta",
        pendiente: "pendiente", "—": "sin-reg",
    };
    const labels: Record<string, string> = {
        asistio: "Asistió", "no asistio": "No asistió", "no_asistio": "No asistió",
        pendiente: "Pendiente",
    };
    const cls = map[estado] || "sin-reg";
    const label = labels[estado] || (estado === "—" ? "Sin registro" : estado);
    return <span className={`ins-badge ${cls}`}>{label}</span>;
};

/* ═══════════ COMPONENTE PRINCIPAL ═══════════ */

const InscritosEvento: React.FC = () => {
    /* ── State ── */
    const { id } = useParams();
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [eventoSelId, setEventoSelId] = useState<string>(id || "");
    const eventoSel = useMemo(() => eventos.find(e => e._id === eventoSelId) || null, [eventos, eventoSelId]);

    const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
    const [loadingInv, setLoadingInv] = useState(false);

    const [tab, setTab] = useState<TabType>("inscritos");
    const [busqueda, setBusqueda] = useState("");
    const [filtroInv, setFiltroInv] = useState<FiltroInv>("todos");

    const [asistenciaLocal, setAsistenciaLocal] = useState<Record<string, string>>({});
    const [savingAsist, setSavingAsist] = useState(false);
    const [toast, setToast] = useState("");

    const [pagina, setPagina] = useState(1);
    const POR_PAGINA = 15;

    /* ── Fetch eventos ── */
    const fetchEventos = useCallback(async () => {
        try {
            const res = await api.get("/events");
            const raw = res.data;
            const lista: Evento[] = Array.isArray(raw) ? raw
                : Array.isArray(raw.data) ? raw.data : [];
            setEventos(lista);
        } catch { /* silencioso */ }
    }, []);

    /* ── Fetch invitaciones ── */
    const fetchInvitaciones = useCallback(async (eventoId: string) => {
        if (!eventoId) return;
        setLoadingInv(true);
        try {
            const res = await api.get(`/invitaciones/event/${eventoId}`);
            const raw = res.data;
            const lista: Invitacion[] = Array.isArray(raw) ? raw
                : Array.isArray(raw.data) ? raw.data : (raw.invitaciones ?? []);
            setInvitaciones(lista);
            // Inicializar asistencia local con valores actuales
            const mapa: Record<string, string> = {};
            lista.forEach(inv => { mapa[inv._id] = inv.estadoAsistencia || "pendiente"; });
            setAsistenciaLocal(mapa);
        } catch { setInvitaciones([]); }
        finally { setLoadingInv(false); }
    }, []);

    useEffect(() => { fetchEventos(); }, [fetchEventos]);

    useEffect(() => {
        if (eventoSelId) { fetchInvitaciones(eventoSelId); setPagina(1); }
        else { setInvitaciones([]); setAsistenciaLocal({}); }
    }, [eventoSelId, fetchInvitaciones]);
    useEffect(() => {
        if (id) {
            setEventoSelId(id);
        }
    }, [id]);

    /* ── Actualizar estado de invitación ── */
    const updateEstadoInv = async (invId: string, estado: "aceptada" | "rechazada") => {
        try {
            await api.patch(`/invitaciones/${invId}/status`, { estadoInvitacion: estado });
            setInvitaciones(prev => prev.map(inv =>
                inv._id === invId ? { ...inv, estadoInvitacion: estado } : inv
            ));
            showToast(estado === "aceptada" ? "Inscripción aceptada ✓" : "Inscripción rechazada");
        } catch { showToast("Error al actualizar estado"); }
    };

    /* ── Actualizar asistencia local (sin guardar aún) ── */
    const toggleAsistencia = (invId: string, valor: string) => {
        setAsistenciaLocal(prev => ({
            ...prev,
            [invId]: prev[invId] === valor ? "pendiente" : valor,
        }));
    };

    /* ── Guardar asistencia en batch ── */
    const guardarAsistencia = async () => {
        setSavingAsist(true);
        try {
            const cambios = Object.entries(asistenciaLocal).filter(([id, estado]) => {
                const inv = invitaciones.find(i => i._id === id);
                return inv && inv.estadoAsistencia !== estado;
            });
            await Promise.all(cambios.map(([id, estado]) =>
                api.patch(`/invitaciones/${id}/asistencia`, { estadoAsistencia: estado })
            ));
            // Refrescar
            if (eventoSelId) await fetchInvitaciones(eventoSelId);
            showToast(`Lista de asistencia guardada (${cambios.length} cambio${cambios.length !== 1 ? "s" : ""}) ✓`);
        } catch { showToast("Error al guardar asistencia"); }
        finally { setSavingAsist(false); }
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    /* Export to Excel */
    const descargarExcel = () => {
        if (!eventoSel || invAsistencia.length === 0) {
            showToast("No hay datos para descargar");
            return;
        }

        const datosExcel = invAsistencia.map((inv, index) => ({
            "#": index + 1,
            "Nombre": getNombre(inv.usuario),
            "Correo": getEmail(inv.usuario),
            "Estado": inv.estadoAsistencia === "asistio" ? "Asistió" : inv.estadoAsistencia === "no_asistio" ? "No asistió" : "Pendiente",
        }));

        const worksheet = XLSX.utils.json_to_sheet(datosExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia");

        const filename = `Pase_Lista_${eventoSel.titulo}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
        showToast("Pase de lista descargado (Excel) ✓");
    };

    /* Export to PDF — versión institucional */
    const descargarPDF = () => {
        if (!eventoSel || invAsistencia.length === 0) {
            showToast("No hay datos para descargar");
            return;
        }

        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const pw = doc.internal.pageSize.getWidth();
        const BRAND_PRIMARY:   [number,number,number] = [0, 84, 166];
        const BRAND_SECONDARY: [number,number,number] = [0, 153, 68];
        const BRAND_WHITE:     [number,number,number] = [255, 255, 255];
        const BRAND_DARK:      [number,number,number] = [30, 30, 50];
        const BRAND_GRAY:      [number,number,number] = [100, 100, 110];
        const BRAND_LIGHT:     [number,number,number] = [240, 242, 245];

        doc.setFillColor(...BRAND_PRIMARY);
        doc.rect(0, 0, pw, 22, "F");
        doc.setTextColor(...BRAND_WHITE);
        doc.setFontSize(9); doc.setFont("helvetica", "bold");
        doc.text("UTEQ Connect — Universidad Tecnológica de Querétaro", 14, 9);
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        doc.text(`Generado: ${new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`, pw - 14, 9, { align: "right" });
        doc.setFillColor(...BRAND_SECONDARY);
        doc.rect(0, 22, pw, 3, "F");

        doc.setTextColor(...BRAND_DARK);
        doc.setFontSize(15); doc.setFont("helvetica", "bold");
        doc.text("Pase de Lista — Registro de Asistencia", 14, 37);
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_GRAY);
        doc.text(`Evento: ${eventoSel.titulo}`, 14, 44);

        const asistio   = invAsistencia.filter(i => i.estadoAsistencia === "asistio").length;
        const noAsistio = invAsistencia.filter(i => i.estadoAsistencia === "no_asistio").length;
        const pct       = invAsistencia.length > 0 ? Math.round((asistio / invAsistencia.length) * 100) : 0;
        const kpis = [
            { label: "Total Inscritos", value: invAsistencia.length },
            { label: "Asistieron",      value: asistio },
            { label: "No Asistió",      value: noAsistio },
            { label: "% Asistencia",    value: `${pct}%` },
        ];
        let y = 52;
        const boxW = (pw - 28 - 3 * 4) / 4;
        let bx = 14;
        kpis.forEach(k => {
            doc.setFillColor(...BRAND_LIGHT);
            doc.roundedRect(bx, y, boxW, 18, 2, 2, "F");
            doc.setFillColor(...BRAND_PRIMARY);
            doc.roundedRect(bx, y, 3, 18, 1, 1, "F");
            doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...BRAND_PRIMARY);
            doc.text(String(k.value), bx + 8, y + 10);
            doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_GRAY);
            doc.text(k.label, bx + 8, y + 15);
            bx += boxW + 4;
        });
        y += 26;

        doc.setFillColor(...BRAND_LIGHT);
        doc.roundedRect(14, y, pw - 28, 18, 2, 2, "F");
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...BRAND_GRAY);
        doc.text(`Fecha: ${formatFecha(eventoSel.fecha)}`, 20, y + 7);
        doc.text(`Hora: ${eventoSel.horaInicio} - ${eventoSel.horaFin}`, 75, y + 7);
        doc.text(`Ubicación: ${getNombreDestino(eventoSel.destino)}`, 145, y + 7);
        doc.text(`Cupos: ${eventoSel.cupos} totales / ${eventoSel.cuposDisponibles} disponibles`, 20, y + 13);
        y += 24;

        const tableData = invAsistencia.map((inv, idx) => [
            idx + 1,
            getNombre(inv.usuario),
            getEmail(inv.usuario),
            inv.estadoInvitacion === "aceptada" ? "Aceptada" : inv.estadoInvitacion === "rechazada" ? "Rechazada" : "Enviada",
            inv.estadoAsistencia === "asistio" ? "Asistió" : inv.estadoAsistencia === "no_asistio" ? "No asistió" : "Pendiente",
        ]);

        (doc as any).autoTable({
            head: [["#", "Nombre Completo", "Correo Electrónico", "Invitación", "Asistencia"]],
            body: tableData,
            startY: y,
            headStyles:         { fillColor: BRAND_PRIMARY, textColor: BRAND_WHITE, fontStyle: "bold", fontSize: 8.5, cellPadding: 4 },
            bodyStyles:         { textColor: BRAND_DARK, fontSize: 8, cellPadding: 3.5 },
            alternateRowStyles: { fillColor: [248, 249, 252] },
            margin:             { left: 14, right: 14 },
            tableLineColor:     [220, 225, 235],
            tableLineWidth:     0.2,
            columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 55 }, 2: { cellWidth: 65 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28 } },
        });

        const ph = doc.internal.pageSize.getHeight();
        const totalPgs = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPgs; i++) {
            doc.setPage(i);
            doc.setFillColor(...BRAND_LIGHT);
            doc.rect(0, ph - 12, pw, 12, "F");
            doc.setTextColor(...BRAND_GRAY); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
            doc.text("UTEQ Connect — Documento generado automáticamente. Uso interno.", 14, ph - 4.5);
            doc.text(`Página ${i} de ${totalPgs}`, pw - 14, ph - 4.5, { align: "right" });
        }

        doc.save(`Pase_Lista_${eventoSel.titulo}_${new Date().toISOString().split("T")[0]}.pdf`);
        showToast("Pase de lista descargado (PDF) ✓");
    };

    /* ── Listas filtradas ── */
    const invFiltradas = useMemo(() => {
        let lista = [...invitaciones];
        if (filtroInv !== "todos") lista = lista.filter(i => i.estadoInvitacion === filtroInv);
        if (busqueda) {
            const q = busqueda.toLowerCase();
            lista = lista.filter(i =>
                getNombre(i.usuario).toLowerCase().includes(q) ||
                getEmail(i.usuario).toLowerCase().includes(q)
            );
        }
        return lista;
    }, [invitaciones, filtroInv, busqueda]);

    // Para asistencia: solo los que están aceptados
    const invAsistencia = useMemo(() => {
        let lista = invitaciones.filter(i => i.estadoInvitacion === "aceptada");
        if (busqueda) {
            const q = busqueda.toLowerCase();
            lista = lista.filter(i =>
                getNombre(i.usuario).toLowerCase().includes(q) ||
                getEmail(i.usuario).toLowerCase().includes(q)
            );
        }
        return lista;
    }, [invitaciones, busqueda]);

    const listaActiva = tab === "inscritos" ? invFiltradas : invAsistencia;
    const listaPagina = listaActiva.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total: invitaciones.length,
        aceptados: invitaciones.filter(i => i.estadoInvitacion === "aceptada").length,
        pendientes: invitaciones.filter(i => i.estadoInvitacion === "enviada" || i.estadoInvitacion === "pendiente").length,
        asistieron: invitaciones.filter(i => i.estadoAsistencia === "asistio").length,
    }), [invitaciones]);

    /* ── Render ── */
    return (
        <div className="ins-wrapper">
            <NavSpAdmin />

            <main className="ins-main">
                {/* Topbar */}
                <div className="ins-topbar">
                    <div className="ins-topbar-inner">
                        <div>
                            <h1><ClipboardList size={20} /> Inscritos y Asistencia</h1>
                            <p>Gestión de inscripciones y control de asistencia a eventos</p>
                        </div>
                    </div>
                </div>

                <div className="ins-content">
                                        {/* Sin evento seleccionado */}
                    {!eventoSelId && (
                        <div className="ins-placeholder">
                            <Calendar size={56} />
                            <p>Selecciona un evento para ver sus inscritos y gestionar la asistencia.</p>
                        </div>
                    )}

                    {/* Contenido del evento seleccionado */}
                    {eventoSel && (
                        <>
                            {/* Info del evento */}
                            <div className="ins-evento-card">
                                <div className="ins-evento-info">
                                    <div className="ins-evento-icon"><Calendar size={20} /></div>
                                    <div style={{ minWidth: 0 }}>
                                        <p className="ins-evento-titulo">{eventoSel.titulo}</p>
                                        <div className="ins-evento-meta">
                                            <span><Calendar size={12} />{formatFecha(eventoSel.fecha)}</span>
                                            <span><Clock size={12} />{eventoSel.horaInicio} – {eventoSel.horaFin}</span>
                                            <span><MapPin size={12} />{getNombreDestino(eventoSel.destino)}</span>
                                            <span><Users size={12} />{eventoSel.cupos} cupos</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="ins-evento-stats">
                                    <div className="ins-stat-pill ins-stat-total"><strong>{stats.total}</strong>Total</div>
                                    <div className="ins-stat-pill ins-stat-acept"><strong>{stats.aceptados}</strong>Aceptados</div>
                                    <div className="ins-stat-pill ins-stat-pend"><strong>{stats.pendientes}</strong>Pendientes</div>
                                    <div className="ins-stat-pill ins-stat-asist"><strong>{stats.asistieron}</strong>Asistieron</div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="ins-tabs">
                                <button
                                    className={`ins-tab ${tab === "inscritos" ? "active" : ""}`}
                                    onClick={() => { setTab("inscritos"); setPagina(1); setBusqueda(""); }}
                                >
                                    <Users size={15} /> Inscritos
                                    <span className="ins-tab-badge">{invitaciones.length}</span>
                                </button>
                                <button
                                    className={`ins-tab ${tab === "asistencia" ? "active" : ""}`}
                                    onClick={() => { setTab("asistencia"); setPagina(1); setBusqueda(""); }}
                                >
                                    <ClipboardList size={15} /> Pasar Lista
                                    <span className="ins-tab-badge">{stats.aceptados}</span>
                                </button>
                            </div>

                            {/* Loading */}
                            {loadingInv && <div className="ins-loading">Cargando inscritos…</div>}

                            {/* Tab: Inscritos */}
                            {!loadingInv && tab === "inscritos" && (
                                <>
                                    <div className="ins-toolbar">
                                        <div className="ins-toolbar-left">
                                            <div className="ins-filtro-estado">
                                                {(["todos", "aceptada", "enviada", "rechazada"] as FiltroInv[]).map(f => (
                                                    <button
                                                        key={f}
                                                        className={`ins-filtro-btn ${filtroInv === f ? "activo" : ""}`}
                                                        onClick={() => { setFiltroInv(f); setPagina(1); }}
                                                    >
                                                        {f === "todos" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
                                                        <span style={{ marginLeft: 5, opacity: .7 }}>
                                                            ({f === "todos" ? invitaciones.length : invitaciones.filter(i => i.estadoInvitacion === f).length})
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {invFiltradas.length === 0 ? (
                                        <div className="ins-empty">
                                            <Users size={36} />
                                            <h3>Sin inscritos</h3>
                                            <p>{busqueda ? "No hay resultados para tu búsqueda." : "No hay usuarios inscritos en este evento aún."}</p>
                                        </div>
                                    ) : (
                                        <div className="ins-tabla">
                                            <div className="ins-tabla-head">
                                                <div>Usuario</div>
                                                <div>Correo</div>
                                                <div>Inscripción</div>
                                                <div>Asistencia</div>
                                                <div>Acciones</div>
                                            </div>
                                            {listaPagina.map(inv => (
                                                <div key={inv._id} className="ins-fila">
                                                    <div>
                                                        <p className="ins-usuario-nombre">{getNombre(inv.usuario)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="ins-usuario-email" style={{ margin: 0, fontSize: "0.84rem", color: "var(--gray-500)" }}>
                                                            {getEmail(inv.usuario)}
                                                        </p>
                                                    </div>
                                                    <div><BadgeInv estado={inv.estadoInvitacion} /></div>
                                                    <div><BadgeAsist estado={inv.estadoAsistencia || "—"} /></div>
                                                    <div>
                                                        <div className="ins-fila-acciones">
                                                            {inv.estadoInvitacion !== "aceptada" && (
                                                                <button
                                                                    className="ins-btn-accion ins-btn-aceptar"
                                                                    onClick={() => updateEstadoInv(inv._id, "aceptada")}
                                                                >
                                                                    <CheckCircle2 size={13} /> Aceptar
                                                                </button>
                                                            )}
                                                            {inv.estadoInvitacion !== "rechazada" && (
                                                                <button
                                                                    className="ins-btn-accion ins-btn-rechazar"
                                                                    onClick={() => updateEstadoInv(inv._id, "rechazada")}
                                                                >
                                                                    <XCircle size={13} /> Rechazar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Tab: Pasar Lista */}
                            {!loadingInv && tab === "asistencia" && (
                                <>
                                    <div className="ins-toolbar">
                                        <div className="ins-toolbar-left">
                                            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--gray-500)" }}>
                                                Solo se muestran los usuarios con inscripción <strong>aceptada</strong>. Marca su estado de asistencia y guarda.
                                            </p>
                                        </div>
                                        <div className="ins-toolbar-right">
                                            <button
                                                className="ins-btn-accion ins-btn-descarga-excel"
                                                onClick={descargarExcel}
                                                disabled={invAsistencia.length === 0}
                                                title="Descargar como Excel"
                                            >
                                                <FileText size={15} /> Excel
                                            </button>
                                            <button
                                                className="ins-btn-accion ins-btn-descarga-pdf"
                                                onClick={descargarPDF}
                                                disabled={invAsistencia.length === 0}
                                                title="Descargar como PDF"
                                            >
                                                <Download size={15} /> PDF
                                            </button>
                                            <button
                                                className="ins-btn-guardar-lista"
                                                onClick={guardarAsistencia}
                                                disabled={savingAsist || invAsistencia.length === 0}
                                            >
                                                <Save size={15} />
                                                {savingAsist ? "Guardando…" : "Guardar"}
                                            </button>
                                        </div>
                                    </div>

                                    {invAsistencia.length === 0 ? (
                                        <div className="ins-empty">
                                            <ClipboardList size={36} />
                                            <h3>Sin asistentes aceptados</h3>
                                            <p>Acepta inscripciones en la pestaña "Inscritos" para poder pasar lista.</p>
                                        </div>
                                    ) : (
                                        <div className="ins-tabla">
                                            <div className="ins-tabla-head">
                                                <div>Usuario</div>
                                                <div>Correo</div>
                                                <div>Estado actual</div>
                                                <div>Nuevo estado</div>
                                                <div>Marcar</div>
                                            </div>
                                            {listaPagina.map(inv => {
                                                const estadoLocal = asistenciaLocal[inv._id] || "pendiente";
                                                return (
                                                    <div key={inv._id} className="ins-fila">
                                                        <div>
                                                            <p className="ins-usuario-nombre">{getNombre(inv.usuario)}</p>
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--gray-500)" }}>
                                                                {getEmail(inv.usuario)}
                                                            </p>
                                                        </div>
                                                        <div><BadgeAsist estado={inv.estadoAsistencia || "—"} /></div>
                                                        <div><BadgeAsist estado={estadoLocal} /></div>
                                                        <div>
                                                            <div className="ins-fila-acciones">
                                                                <button
                                                                    className={`ins-btn-accion ins-btn-asistio ${estadoLocal === "asistio" ? "active" : ""}`}
                                                                    style={estadoLocal === "asistio" ? { background: "#bbf7d0", fontWeight: 700 } : {}}
                                                                    onClick={() => toggleAsistencia(inv._id, "asistio")}
                                                                >
                                                                    <UserCheck size={13} /> Asistió
                                                                </button>
                                                                <button
                                                                    className={`ins-btn-accion ins-btn-falta ${estadoLocal === "no_asistio" ? "active" : ""}`}
                                                                    style={estadoLocal === "no_asistio" ? { background: "#fecdd3", fontWeight: 700 } : {}}
                                                                    onClick={() => toggleAsistencia(inv._id, "no_asistio")}
                                                                >
                                                                    <UserX size={13} /> Falta
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}

                        </>
                    )}
                </div>
            </main>

            {/* Toast */}
            {toast && (
                <div className="ins-toast">
                    <CheckCircle2 size={16} color="#4ade80" />
                    {toast}
                </div>
            )}
        </div>
    );
};

export default InscritosEvento;
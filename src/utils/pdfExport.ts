import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─────────────────────────────────────────────
// Paleta institucional UTEQ
// ─────────────────────────────────────────────
const BRAND = {
  primary:   [0,  84, 166]  as [number,number,number],  // azul UTEQ
  secondary: [0, 153,  68]  as [number,number,number],  // verde UTEQ
  dark:      [30,  30,  50] as [number,number,number],
  gray:      [100,100,110]  as [number,number,number],
  lightGray: [240,242,245]  as [number,number,number],
  white:     [255,255,255]  as [number,number,number],
  accent:    [255,165,  0]  as [number,number,number],
};

const TODAY = new Date().toLocaleDateString("es-MX", {
  day: "2-digit", month: "long", year: "numeric",
});

// ─────────────────────────────────────────────
// Helper: dibuja encabezado institucional
// ─────────────────────────────────────────────
function drawHeader(doc: jsPDF, titulo: string, subtitulo?: string) {
  const pw = doc.internal.pageSize.getWidth();

  // Barra superior azul
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pw, 22, "F");

  // Nombre institución
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("UTEQ Connect — Universidad Tecnológica de Querétaro", 14, 9);

  // Fecha de generación
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${TODAY}`, pw - 14, 9, { align: "right" });

  // Franja verde fina
  doc.setFillColor(...BRAND.secondary);
  doc.rect(0, 22, pw, 3, "F");

  // Título principal
  doc.setTextColor(...BRAND.dark);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(titulo, 14, 37);

  // Subtítulo opcional
  if (subtitulo) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text(subtitulo, 14, 44);
    return 52;
  }
  return 46;
}

// ─────────────────────────────────────────────
// Helper: dibuja pie de página
// ─────────────────────────────────────────────
function drawFooter(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const totalPages = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND.lightGray);
    doc.rect(0, ph - 12, pw, 12, "F");
    doc.setTextColor(...BRAND.gray);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("UTEQ Connect — Documento generado automáticamente. Uso interno.", 14, ph - 4.5);
    doc.text(`Página ${i} de ${totalPages}`, pw - 14, ph - 4.5, { align: "right" });
  }
}

// ─────────────────────────────────────────────
// Helper: caja de métricas / KPIs
// ─────────────────────────────────────────────
function drawKPIs(doc: jsPDF, kpis: { label: string; value: string | number }[], startY: number): number {
  const pw = doc.internal.pageSize.getWidth();
  const cols = kpis.length <= 4 ? kpis.length : 4;
  const boxW = (pw - 28 - (cols - 1) * 4) / cols;
  let x = 14;

  kpis.slice(0, cols).forEach(kpi => {
    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(x, startY, boxW, 18, 2, 2, "F");
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(x, startY, 3, 18, 1, 1, "F");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text(String(kpi.value), x + 8, startY + 10);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text(kpi.label, x + 8, startY + 15);

    x += boxW + 4;
  });

  return startY + 26;
}

// ─────────────────────────────────────────────
// Estilos de tabla compartidos
// ─────────────────────────────────────────────
const TABLE_STYLES = {
  headStyles: {
    fillColor: BRAND.primary,
    textColor: BRAND.white,
    fontStyle: "bold" as const,
    fontSize: 8.5,
    cellPadding: 4,
  },
  bodyStyles: {
    textColor: BRAND.dark,
    fontSize: 8,
    cellPadding: 3.5,
  },
  alternateRowStyles: {
    fillColor: [248, 249, 252] as [number, number, number],
  },
  columnStyles: {},
  margin: { left: 14, right: 14 },
  tableLineColor: [220, 225, 235] as [number, number, number],
  tableLineWidth: 0.2,
};

// ══════════════════════════════════════════════
// EXPORTADORES POR MÓDULO
// ══════════════════════════════════════════════

// ── 1. USUARIOS ──────────────────────────────
export function exportUsuariosPDF(usuarios: any[], rolActual?: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const activos   = usuarios.filter(u => u.estatus === "activo").length;
  const inactivos = usuarios.filter(u => u.estatus === "inactivo").length;
  const admins    = usuarios.filter(u => u.rol === "admin").length;
  const superAdmins = usuarios.filter(u => u.rol === "superadmin").length;
  const normalUsers = usuarios.filter(u => u.rol === "user").length;

  let y = drawHeader(doc, "Gestión de Usuarios",
    `Total registrados: ${usuarios.length} • Vista: ${rolActual === "superadmin" ? "Super Administrador" : "Administrador"}`);

  y = drawKPIs(doc, [
    { label: "Total Usuarios",   value: usuarios.length },
    { label: "Activos",          value: activos },
    { label: "Inactivos",        value: inactivos },
    { label: "Administradores",  value: admins + superAdmins },
  ], y);

  const rows = usuarios.map(u => [
    u.nombre || "—",
    u.email   || "—",
    u.rol === "superadmin" ? "Super Admin" : u.rol === "admin" ? "Administrador" : "Usuario",
    u.estatus ? u.estatus.charAt(0).toUpperCase() + u.estatus.slice(1) : "—",
    u.fechaCreacion ? new Date(u.fechaCreacion).toLocaleDateString("es-MX") : "—",
  ]);

  autoTable(doc, {
    head: [["Nombre Completo", "Correo Electrónico", "Rol", "Estatus", "Fecha de Registro"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 60 },
      2: { cellWidth: 32 },
      3: { cellWidth: 24 },
      4: { cellWidth: 30 },
    },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = data.cell.text[0]?.toLowerCase();
        const color = val === "activo" ? [22,163,74] : [220,38,38];
        doc.setTextColor(...(color as [number,number,number]));
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(data.cell.text[0], data.cell.x + data.cell.padding("left"),
          data.cell.y + data.cell.height / 2 + 2.5);
        doc.setTextColor(...BRAND.dark);
      }
    },
  });

  // Resumen distribución de roles
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  if (finalY < 250) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.dark);
    doc.text("Distribución de roles:", 14, finalY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text(
      `Usuarios: ${normalUsers}   Administradores: ${admins}   Super Admins: ${superAdmins}`,
      14, finalY + 6
    );
  }

  drawFooter(doc);
  doc.save(`Usuarios_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 2. PERSONAL ──────────────────────────────
export function exportPersonalPDF(personal: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const activos   = personal.filter(p => p.estatus === "activo").length;
  const inactivos = personal.filter(p => p.estatus === "inactivo").length;
  const depts = [...new Set(personal.map(p => p.departamento).filter(Boolean))];

  let y = drawHeader(doc, "Gestión de Personal",
    `Total registrados: ${personal.length} • Departamentos: ${depts.length}`);

  y = drawKPIs(doc, [
    { label: "Total Personal",   value: personal.length },
    { label: "Activos",          value: activos },
    { label: "Inactivos",        value: inactivos },
    { label: "Departamentos",    value: depts.length },
  ], y);

  const rows = personal.map(p => [
    p.numeroEmpleado || "—",
    `${p.nombre || ""} ${p.apellidoPaterno || ""} ${p.apellidoMaterno || ""}`.trim() || "—",
    p.email     || "—",
    p.cargo     || "—",
    p.departamento || "—",
    p.telefono  || "—",
    p.estatus   ? p.estatus.charAt(0).toUpperCase() + p.estatus.slice(1) : "—",
  ]);

  autoTable(doc, {
    head: [["No. Empleado", "Nombre Completo", "Correo", "Cargo", "Departamento", "Teléfono", "Estatus"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 55 },
      2: { cellWidth: 55 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
      5: { cellWidth: 30 },
      6: { cellWidth: 22 },
    },
  });

  drawFooter(doc);
  doc.save(`Personal_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 3. EDIFICIOS / UBICACIONES ────────────────
export function exportEdificiosPDF(edificios: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawHeader(doc, "Edificios y Ubicaciones",
    `Total de destinos registrados: ${edificios.length}`);

  y = drawKPIs(doc, [
    { label: "Total Edificios / Rutas", value: edificios.length },
    { label: "Con imagen",              value: edificios.filter(e => e.image).length },
    { label: "Sin imagen",              value: edificios.filter(e => !e.image).length },
    { label: "Fecha de reporte",        value: TODAY },
  ], y);

  const rows = edificios.map((e, i) => [
    i + 1,
    e.nombre || "—",
    e.posicion?.latitude  != null ? e.posicion.latitude.toFixed(6)  : "—",
    e.posicion?.longitude != null ? e.posicion.longitude.toFixed(6) : "—",
    e.image ? "Sí" : "No",
  ]);

  autoTable(doc, {
    head: [["#", "Nombre / Destino", "Latitud", "Longitud", "Imagen"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 80 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 20 },
    },
  });

  drawFooter(doc);
  doc.save(`Edificios_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 4. ESPACIOS ───────────────────────────────
export function exportEspaciosPDF(espacios: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ocupados    = espacios.filter(e => e.ocupado).length;
  const disponibles = espacios.length - ocupados;
  const totalCupos  = espacios.reduce((s, e) => s + (e.cupos || 0), 0);

  let y = drawHeader(doc, "Espacios del Campus",
    `Total de espacios: ${espacios.length}`);

  y = drawKPIs(doc, [
    { label: "Total Espacios",   value: espacios.length },
    { label: "Disponibles",      value: disponibles },
    { label: "Ocupados",         value: ocupados },
    { label: "Cupos Totales",    value: totalCupos },
  ], y);

  const rows = espacios.map((e, i) => {
    const destino = typeof e.destino === "object" ? e.destino?.nombre : e.destino;
    return [
      i + 1,
      e.nombre      || "—",
      destino        || "—",
      e.planta       || "—",
      e.cupos        != null ? e.cupos : "—",
      e.descripcion  || "—",
      e.ocupado ? "Ocupado" : "Disponible",
    ];
  });

  autoTable(doc, {
    head: [["#", "Nombre del Espacio", "Edificio / Destino", "Planta", "Cupos", "Descripción", "Estado"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 42 },
      2: { cellWidth: 40 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 40 },
      6: { cellWidth: 22 },
    },
  });

  drawFooter(doc);
  doc.save(`Espacios_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 5. EVENTOS ────────────────────────────────
export function exportEventosPDF(eventos: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const activos   = eventos.filter(e => e.activo).length;
  const inactivos = eventos.filter(e => !e.activo).length;
  const totalCupos = eventos.reduce((s, e) => s + (e.cupos || 0), 0);
  const cuposDisp  = eventos.reduce((s, e) => s + (e.cuposDisponibles || 0), 0);

  let y = drawHeader(doc, "Gestión de Eventos",
    `Total de eventos: ${eventos.length}`);

  y = drawKPIs(doc, [
    { label: "Total Eventos",     value: eventos.length },
    { label: "Activos",           value: activos },
    { label: "Inactivos",         value: inactivos },
    { label: "Cupos Totales",     value: totalCupos },
  ], y);

  const rows = eventos.map((e, i) => {
    const destino = typeof e.destino === "object" ? e.destino?.nombre : (e.destino || "—");
    const espacio = typeof e.espacio === "object" ? e.espacio?.nombre : (e.espacio || "—");
    const fecha   = e.fecha ? new Date(e.fecha).toLocaleDateString("es-MX", { timeZone: "UTC" }) : "—";
    const creador = typeof e.creadoPor === "object" ? e.creadoPor?.nombre : (e.creadoPor || "—");
    return [
      i + 1,
      e.titulo       || "—",
      fecha,
      `${e.horaInicio || "—"} - ${e.horaFin || "—"}`,
      destino,
      espacio,
      e.cupos         != null ? e.cupos : "—",
      e.cuposDisponibles != null ? e.cuposDisponibles : "—",
      e.activo ? "Activo" : "Inactivo",
      creador,
    ];
  });

  autoTable(doc, {
    head: [["#", "Título", "Fecha", "Horario", "Edificio", "Espacio", "Cupos", "Disponibles", "Estado", "Creado por"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 45 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 30 },
      5: { cellWidth: 28 },
      6: { cellWidth: 16 },
      7: { cellWidth: 22 },
      8: { cellWidth: 18 },
      9: { cellWidth: 35 },
    },
  });

  drawFooter(doc);
  doc.save(`Eventos_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 6. MÉTRICAS DE EVENTOS ────────────────────
export function exportMetricasEventosPDF(stats: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const totalAsistencias  = stats.reduce((s, e) => s + e.asistencias, 0);
  const totalAceptadas    = stats.reduce((s, e) => s + e.aceptadas, 0);
  const totalPendientes   = stats.reduce((s, e) => s + e.pendientes, 0);
  const totalNoAsistio    = stats.reduce((s, e) => s + e.noAsistio, 0);

  let y = drawHeader(doc, "Panel de Métricas de Eventos",
    "Resumen de asistencia e inscripciones por evento");

  y = drawKPIs(doc, [
    { label: "Total Eventos",     value: stats.length },
    { label: "Total Asistencias", value: totalAsistencias },
    { label: "Aceptadas",         value: totalAceptadas },
    { label: "No Asistió",        value: totalNoAsistio },
  ], y);

  const rows = stats.map((s, i) => {
    const tasaAsistencia = s.aceptadas > 0
      ? `${Math.round((s.asistencias / s.aceptadas) * 100)}%`
      : "0%";
    return [
      i + 1,
      s.titulo      || "—",
      s.aceptadas   ?? 0,
      s.asistencias ?? 0,
      s.noAsistio   ?? 0,
      s.pendientes  ?? 0,
      s.total       ?? 0,
      tasaAsistencia,
    ];
  });

  autoTable(doc, {
    head: [["#", "Evento", "Aceptadas", "Asistencias", "No Asistió", "Pendientes", "Total Inv.", "% Asistencia"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 80 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 24 },
      5: { cellWidth: 24 },
      6: { cellWidth: 22 },
      7: { cellWidth: 30 },
    },
  });

  drawFooter(doc);
  doc.save(`Metricas_Eventos_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 7. REPORTES / MONITOREO ───────────────────
export function exportReportesPDF(totales: {
  usuarios: number; edificios: number; eventos: number;
  eventosActivos: number; eventosInactivos: number; personal: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();

  let y = drawHeader(doc, "Monitoreo y Reportes del Sistema",
    "Resumen ejecutivo del estado actual del sistema");

  y = drawKPIs(doc, [
    { label: "Usuarios Registrados", value: totales.usuarios  },
    { label: "Edificios y Rutas",    value: totales.edificios },
    { label: "Eventos Totales",      value: totales.eventos   },
    { label: "Personal Registrado",  value: totales.personal  },
  ], y);

  y += 4;

  // Sección: Estado de Eventos
  doc.setFillColor(...BRAND.lightGray);
  doc.roundedRect(14, y, pw - 28, 28, 2, 2, "F");
  doc.setFillColor(...BRAND.primary);
  doc.roundedRect(14, y, 3, 28, 1, 1, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.dark);
  doc.text("Estado de Eventos", 22, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  doc.setFontSize(8.5);
  doc.text(`• Eventos activos:   ${totales.eventosActivos}`, 22, y + 15);
  doc.text(`• Eventos inactivos: ${totales.eventosInactivos}`, 22, y + 21);

  const pctActivos = totales.eventos > 0
    ? Math.round((totales.eventosActivos / totales.eventos) * 100)
    : 0;
  doc.setFontSize(8);
  doc.text(`Tasa de actividad: ${pctActivos}%`, pw - 50, y + 15);

  y += 36;

  // Tabla resumen
  autoTable(doc, {
    head: [["Módulo", "Total Registros", "Estado"]],
    body: [
      ["Usuarios",          totales.usuarios,          "Operativo"],
      ["Personal",          totales.personal,          "Operativo"],
      ["Edificios y Rutas", totales.edificios,         "Operativo"],
      ["Eventos (Activos)", totales.eventosActivos,    "Activo"   ],
      ["Eventos (Inactivos)", totales.eventosInactivos, "Inactivo" ],
    ],
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 50 },
      2: { cellWidth: 50 },
    },
  });

  // Nota al pie del reporte
  const noteY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BRAND.gray);
  doc.text(
    "Este reporte es generado automáticamente con los datos actuales del sistema UTEQ Connect.",
    14, noteY
  );

  drawFooter(doc);
  doc.save(`Reporte_Sistema_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ── 8. LOGS ───────────────────────────────────
export function exportLogsPDF(logs: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawHeader(doc, "Logs de Seguridad del Sistema",
    `Total de registros: ${logs.length}`);

  const rows = logs.map((l, i) => [
    i + 1,
    l.evento      || "—",
    l.detalle     || "—",
    l.userId      || "—",
    l.fecha ? new Date(l.fecha).toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—",
  ]);

  autoTable(doc, {
    head: [["#", "Evento", "Descripción", "Usuario", "Fecha y Hora"]],
    body: rows,
    startY: y,
    ...TABLE_STYLES,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 38 },
      2: { cellWidth: 80 },
      3: { cellWidth: 30 },
      4: { cellWidth: 34 },
    },
  });

  drawFooter(doc);
  doc.save(`Logs_Seguridad_UTEQ_${new Date().toISOString().split("T")[0]}.pdf`);
}
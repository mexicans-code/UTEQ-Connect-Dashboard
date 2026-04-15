import React, { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";

interface Props {
  currentImage?: string | null;
  placeholder?: React.ReactNode;   // avatar/icono cuando no hay imagen
  /**
   * Se llama inmediatamente al seleccionar el archivo y sube al servidor.
   * Úsalo cuando ya tienes un ID (modo edición).
   */
  onUpload?: (file: File) => Promise<void>;
  /**
   * Solo notifica al padre qué archivo seleccionó el usuario, sin subir nada.
   * Úsalo en modo creación para guardar el archivo y subirlo al dar "Guardar".
   */
  onFileSelect?: (file: File | null) => void;
  onDelete?: () => Promise<void>;
  uploading?: boolean;
  shape?: "circle" | "rect";
  size?: number;                   // px para círculo; ancho para rect
  accept?: string;
}

const ImageUploader: React.FC<Props> = ({
  currentImage,
  placeholder,
  onUpload,
  onFileSelect,
  onDelete,
  uploading = false,
  shape = "circle",
  size = 96,
  accept = "image/jpeg,image/png,image/webp,image/gif",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hovered, setHovered]  = useState(false);

  const imgSrc = preview || currentImage || null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onFileSelect) {
      // Modo creación: solo mostrar preview local, el padre guarda el archivo
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      onFileSelect(file);
      if (inputRef.current) inputRef.current.value = "";
    } else if (onUpload) {
      // Modo edición: subir al servidor de inmediato
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      await onUpload(file);
      setPreview(null);         // limpiar preview: la imagen real vendrá del fetch
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    setPreview(null);
    if (onFileSelect) {
      // Modo creación: limpiar archivo pendiente en el padre
      onFileSelect(null);
    } else if (onDelete) {
      // Modo edición: eliminar del servidor
      await onDelete();
    }
  };

  const isCircle = shape === "circle";
  const wrapStyle: React.CSSProperties = {
    position: "relative",
    width: isCircle ? size : "100%",
    height: isCircle ? size : size,
    flexShrink: 0,
    cursor: "pointer",
  };

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: isCircle ? "50%" : 10,
    border: "2px solid var(--blue-200, #bfdbfe)",
    display: "block",
  };

  const placeholderStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: isCircle ? "50%" : 10,
    background: "linear-gradient(135deg, var(--blue-100,#dbeafe), var(--blue-200,#bfdbfe))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px dashed var(--blue-300,#93c5fd)",
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: isCircle ? "50%" : 10,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    opacity: hovered || uploading ? 1 : 0,
    transition: "opacity 0.18s",
    pointerEvents: hovered ? "auto" : "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        style={wrapStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        title="Haz clic para cambiar la imagen"
      >
        {imgSrc
          ? <img src={imgSrc} alt="Imagen" style={imgStyle} />
          : <div style={placeholderStyle}>{placeholder || <Camera size={isCircle ? size / 3 : 28} color="var(--blue-400,#60a5fa)" />}</div>
        }

        {/* Overlay */}
        <div style={overlayStyle}>
          {uploading ? (
            <span style={{ color: "#fff", fontSize: "0.72rem", fontWeight: 600 }}>Subiendo…</span>
          ) : (
            <>
              <Upload size={isCircle ? 18 : 22} color="#fff" />
              <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                {imgSrc ? "Cambiar" : "Subir imagen"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Botón eliminar (solo si hay imagen y se proveyó onDelete) */}
      {imgSrc && onDelete && !uploading && (
        <button
          onClick={e => { e.stopPropagation(); handleDelete(); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "var(--red-50,#fef2f2)", color: "var(--red-600,#dc2626)",
            border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6,
            padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-sans)",
          }}
          title="Eliminar imagen"
        >
          <Trash2 size={12} /> Eliminar foto
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default ImageUploader;
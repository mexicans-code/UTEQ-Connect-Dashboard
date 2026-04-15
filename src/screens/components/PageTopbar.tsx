import React from "react";
import { FileDown } from "lucide-react";

interface PageTopbarProps {
  title: string;
  subtitle?: string;
  onDownloadPDF?: () => void;
  showDownload?: boolean;
  children?: React.ReactNode;
}

const PageTopbar: React.FC<PageTopbarProps> = ({
  title,
  subtitle,
  onDownloadPDF,
  showDownload = true,
  children,
}) => {
  return (
    <header className="page-topbar">
      <div className="page-topbar__left">
        <h1 className="page-topbar__title">{title}</h1>
        {subtitle && (
          <p className="page-topbar__subtitle">{subtitle}</p>
        )}
      </div>

      <div className="page-topbar__actions">
        {children}
        {showDownload && onDownloadPDF && (
          <button
            data-action
            className="page-topbar__pdf-btn"
            onClick={onDownloadPDF}
            title="Descargar PDF"
          >
            <FileDown size={15} />
            <span>Descargar PDF</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default PageTopbar;

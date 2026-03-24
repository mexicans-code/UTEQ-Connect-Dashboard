import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import "./ThemeToggle.css";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "", showLabel = true }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      className={`theme-toggle ${isDark ? "theme-toggle--dark" : "theme-toggle--light"} ${className}`}
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isDark ? (
            <Moon size={13} strokeWidth={2.5} />
          ) : (
            <Sun size={13} strokeWidth={2.5} />
          )}
        </span>
      </span>
      {showLabel && (
        <span className="theme-toggle__label">
          {isDark ? "Oscuro" : "Claro"}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;


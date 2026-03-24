import React from "react";
import "../../styles/CardUbicacion.css";

interface CardUbicacionProps {
  titulo: string;
  descripcion: string;
  img: string;
  active?: boolean;
  onClick?: () => void;
}

const CardUbicacion: React.FC<CardUbicacionProps> = ({
  titulo,
  descripcion,
  img,
  active = false,
  onClick,
}) => {
  return (
    <div
      className={`card-ubicacion ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <img src={img} alt={titulo} className="card-img" />

      <div className="card-body">
        <h3>{titulo}</h3>
        <p>{descripcion}</p>
      </div>
    </div>
  );
};

export default CardUbicacion;
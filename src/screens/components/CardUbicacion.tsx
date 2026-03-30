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
      <div className="card-ubicacion__img-wrapper">
        <img src={img} alt={titulo} className="card-ubicacion__img" />
      </div>

      <div className="card-ubicacion__body">
        <h3 className="card-ubicacion__nombre">{titulo}</h3>
        <p className="card-ubicacion__descripcion">{descripcion}</p>
      </div>
    </div>
  );
};

export default CardUbicacion;
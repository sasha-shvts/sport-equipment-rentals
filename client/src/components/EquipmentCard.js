import React from "react";

function EquipmentCard({ item, onRent }) {
  return (
    <article className="equipment-card">
      <h3>{item.name}</h3>
      <p>{item.short}</p>
      <ul>
        {item.features.map((f, index) => (
          <li key={index}>{f}</li>
        ))}
      </ul>
      <p className="price">{item.price} грн / день</p>
      <button onClick={() => onRent(item)}>Орендувати</button>
    </article>
  );
}

export default EquipmentCard;

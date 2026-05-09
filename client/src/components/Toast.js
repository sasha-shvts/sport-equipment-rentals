import React from "react";
import "./toast.css";

function Toast({ message, visible }) {
  return (
    <div className={`toast ${visible ? "toast-show" : ""}`}>
      {message}
    </div>
  );
}

export default Toast;
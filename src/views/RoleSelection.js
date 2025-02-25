import React from "react";
import { useNavigate } from "react-router-dom";
import './../styles/RoleSelection.css';

function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div id="roleSelectionView">
      <h2>Choose your role</h2>
      <div id="roleButtons">
        <button 
          onClick={() => navigate("/admin-login")}
          className="button"
        >Admin
        </button>
        <button 
          onClick={() => navigate("/main-view", { state: { role: "Presenter" } })}
          className="button"
        >Presenter
        </button>
      </div>
    </div>
  );
}

export default RoleSelection;

import React from "react";
import { useNavigate } from "react-router-dom";

function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Choose your role</h1>
      <button onClick={() => navigate("/admin-login")}>Admin</button>
      <button onClick={() => navigate("/main-view", { state: { role: "Presenter" } })}>Presenter</button>
    </div>
  );
}

export default RoleSelection;

import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";

function MainView() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.state?.role || "Unknown";

  const handleLogout = () => {
    auth.signOut(); // Sign out from Firebase
    navigate("/");  // Redirect to role selection
  };

  return (
    <div>
      <h1>You are {role}</h1>
      <button onClick={handleLogout} style={{ marginTop: "20px" }}>Logout</button>
    </div>
  );
}

export default MainView;

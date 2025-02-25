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
      {role === "Admin" && (
        <h1>Only you as an {role} can see this</h1>
      )}
      <h1>You are {role}</h1>
      <button onClick={handleLogout} style={{ marginTop: "20px" }}>Logout</button>
    </div>
  );
}

export default MainView;

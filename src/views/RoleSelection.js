import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { signInAnonymously } from "firebase/auth";
import './../styles/RoleSelection.css';

function RoleSelection() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handlePresenterSignIn = async () => {
    try {
      await signInAnonymously(auth);
      navigate("/main-view");
    } catch (err) {
      setError(err.message);
      console.error("Error signing in anonymously:", err);
    }
  };

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
          onClick={handlePresenterSignIn}
          className="button"
        >Presenter
        </button>
      </div>
    </div>
  );
}

export default RoleSelection;
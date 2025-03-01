import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import './../styles/AdminLogin.css';
import BackIcon from './../resources/icons/arrow-left.svg';

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const handleLogin = useCallback(async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const adminDocRef = doc(db, "admins", user.uid);
      await setDoc(adminDocRef, { admin_id: user.uid }, { merge: true });
      navigate("/main-view");
    } catch (err) {
      setError("Invalid email or password");
      console.error("Error signing in with email/password:", err);
    }
  }, [auth, db, email, navigate, password]);
  return (
    <div id="adminLoginView">
      <img src={BackIcon} alt="back" id="backButton" className="icon" onClick={() => navigate("/")}/>
      <div className="inputContainer">
        <input 
          type="email" 
          required
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
        />
        <label>Email</label>
      </div>
      <div className="inputContainer">
        <input 
          type="password" 
          required
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
        />
        <label>Password</label>
      </div>
      <button onClick={handleLogin} className="button">Login</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default AdminLogin;
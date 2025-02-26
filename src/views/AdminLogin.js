import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc } from "firebase/firestore"; // Import Firestore functions
import { db } from "../firebase/firebaseConfig"; // Import your Firestore instance
import './../styles/AdminLogin.css';
import BackIcon from './../resources/icons/arrow-left.svg';

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Add admin ID to Firestore
      const adminsCollection = collection(db, "admins");
      const adminDoc = doc(adminsCollection, user.uid); // Use user.uid as document ID
      await setDoc(adminDoc, { admin_id: user.uid }, { merge: true }); // Add or merge document

      navigate("/main-view");
    } catch (err) {
      setError("Invalid email or password");
      console.error("Error signing in with email/password:", err);
    }
  };

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
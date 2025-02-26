import React, { useEffect, useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore"; // Import Firestore functions
import { db } from "../firebase/firebaseConfig"; // Import your Firestore instance

function MainView() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Default to false
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          // Check if user is an admin
          const adminsCollection = collection(db, "admins");
          const adminsSnapshot = await getDocs(adminsCollection);
          const adminIds = adminsSnapshot.docs.map((doc) => doc.data().admin_id);
          setIsAdmin(adminIds.includes(user.uid));
        } catch (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false); // Default to false on error
        }
      } else {
        setIsAdmin(false); // User is logged out
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Main View</h1>
      <p>User ID: {user.uid}</p>
      {isAdmin && <p>Only you as an admin can see this.</p>}
      <button onClick={handleLogout}>Logout</button>
      {/* Your timer app logic here */}
    </div>
  );
}

export default MainView;
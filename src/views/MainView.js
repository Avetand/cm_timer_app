import React, { useEffect, useState, useCallback, useMemo } from "react";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import './../styles/MainView.css';
import LogoutIcon from './../resources/icons/logout.svg';
import EditIcon from './../resources/icons/edit.svg';
import DeleteIcon from './../resources/icons/delete.svg';

function MainView() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [presenters, setPresenters] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdminCached = useMemo(() => {
    if (!user) return false;
    return false;
  }, [user]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          const adminsCollection = collection(db, "admins");
          const adminsSnapshot = await getDocs(adminsCollection);
          const adminIds = adminsSnapshot.docs.map((doc) => doc.data().admin_id);
          setIsAdmin(adminIds.includes(user.uid));
        } catch (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
        } finally {
          setLoading(false);
        }
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const presentersCollection = collection(db, "presenters");
    const unsubscribe = onSnapshot(presentersCollection, (snapshot) => {
      const presentersList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      presentersList.sort((a, b) => a.timestamp - b.timestamp);
      setPresenters(presentersList);
    });
    return () => unsubscribe();
  }, []);
  
  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [navigate]);

  const handleAddOrUpdatePresenter = useCallback(async () => {
    if (!name || !duration) return;
    if (duration < 1 || duration > 60) {
      setDuration("");
      return;
    }
    try {
      const presentersCollection = collection(db, "presenters");
      if (editId) {
        const presenterRef = doc(db, "presenters", editId);
        await updateDoc(presenterRef, {
          name,
          duration: parseInt(duration, 10)
        });
          setEditId(null);
      } else {
        await addDoc(presentersCollection, {
          name,
          duration: parseInt(duration, 10),
          timestamp: Date.now(),
        });
      }
      setName("");
      setDuration("");
    } catch (error) {
      console.error("Error adding/updating presenter:", error);
    }
  }, [name, duration, editId]);

  const handleDeletePresenter = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, "presenters", id));
    } catch (error) {
      console.error("Error deleting presenter:", error);
    }
  }, []);

  const handleEditPresenter = useCallback((presenter) => {
    setName(presenter.name);
    setDuration(presenter.duration.toString());
    setEditId(presenter.id);
  }, []);

  const isFormValid = useMemo(() => {
    return name && duration && duration > 0 && duration <= 60;
  }, [name, duration]);
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <div id="mainView">
      <div id="contentWrapper">
        {isAdmin && (
          <div id="adminPanel" className="wrapper">
            <div id="addForm">
              <input
                type="text"
                required
                placeholder="Presenter Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="number"
                required
                placeholder="Duration (min)"
                value={duration}
                min="1"
                max="60"
                onChange={(e) => setDuration(e.target.value)}
              />
              <button
                onClick={handleAddOrUpdatePresenter}
                style={{
                  backgroundColor: isFormValid ? "#63b866" : "gray",
                  cursor: isFormValid ? "pointer" : "not-allowed"
                }}
                disabled={!isFormValid}
              >
                {editId ? "Modify" : "Add"}
              </button>
            </div>
          </div>
        )}
        <div id="presentersPanel" className="wrapper">
          <img src={LogoutIcon} alt="logout" id="logoutButton" onClick={handleLogout} />
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Duration</th>
                <th>Total time</th>
                {isAdmin && (<th>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {presenters.map((presenter, index) => (
                <tr key={presenter.id}>
                  <td>{index + 1}</td>
                  <td>{presenter.name}</td>
                  <td>{presenter.duration} min</td>
                  <td>{/* total time */}</td>
                  {isAdmin && (
                    <td>
                      <img src={EditIcon} alt="edit" className="icon" onClick={() => handleEditPresenter(presenter)} />
                      <img src={DeleteIcon} alt="delete" className="icon" onClick={() => handleDeletePresenter(presenter.id)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MainView;
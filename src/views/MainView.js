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

  // Timer and Stopwatch State
  const [currentPresenterIndex, setCurrentPresenterIndex] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTimes, setTotalTimes] = useState({}); // Store total times for each presenter {presenterId: timeInSeconds}

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


  // Timer and Stopwatch Logic

  const startTimer = useCallback(() => {
    if (presenters.length === 0) return; // Prevent starting with no presenters
    setCurrentPresenterIndex(0);
    setTimerSeconds(presenters[0].duration * 60); // Convert minutes to seconds
    setStopwatchSeconds(0);
    setIsRunning(true);
  }, [presenters]);

  const nextPresenter = useCallback(() => {
    if (!isRunning) return;

    // Store the total time for the current presenter
    setTotalTimes(prevTimes => ({
      ...prevTimes,
      [presenters[currentPresenterIndex].id]: stopwatchSeconds,
    }));

    const nextIndex = currentPresenterIndex + 1;

    if (nextIndex < presenters.length) {
      setCurrentPresenterIndex(nextIndex);
      setTimerSeconds(presenters[nextIndex].duration * 60);
      setStopwatchSeconds(0); // Reset stopwatch for the new presenter
    } else {
      // Finish the presentation
      setTotalTimes(prevTimes => ({
        ...prevTimes,
        [presenters[currentPresenterIndex].id]: stopwatchSeconds,
      }));
      setIsRunning(false);
      setCurrentPresenterIndex(null);
      setTimerSeconds(0);
      setStopwatchSeconds(0);
    }
  }, [currentPresenterIndex, presenters, isRunning, stopwatchSeconds]);

  // useEffect for Timer
  useEffect(() => {
    let interval = null;

    if (isRunning && currentPresenterIndex !== null) {
      interval = setInterval(() => {
        setTimerSeconds((prevSeconds) => prevSeconds - 1);
        setStopwatchSeconds((prevSeconds) => prevSeconds + 1);
      }, 1000);
    }

    return () => clearInterval(interval); // Cleanup on unmount or when isRunning changes
  }, [isRunning, currentPresenterIndex]);

  // Format Time (mm:ss)
  const formatTime = (seconds) => {
    const minutes = Math.abs(Math.floor(seconds / 60));
    const remainingSeconds = Math.abs(seconds % 60);
    const sign = seconds < 0 ? "+" : "";
    return `${sign}${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Overtime styling
  const timerStyle = {
    color: timerSeconds < 0 ? 'red' : 'black'
  };

  const currentPresenter = useMemo(() => {
    return currentPresenterIndex !== null ? presenters[currentPresenterIndex] : null;
  }, [currentPresenterIndex, presenters]);

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
            <div>
              {!isRunning && (
                <button onClick={startTimer} disabled={isRunning || presenters.length === 0}>
                  Start
                </button>
              )}
              {isRunning && (
                <button onClick={nextPresenter}>
                  {currentPresenterIndex === presenters.length - 1 ? "Finish" : "Next"}
                </button>
              )}
            </div>
          </div>
        )}

        {isRunning && currentPresenter && (
          <div id="timerPanel">
            <div id="currentTimer" style={timerStyle}>{formatTime(timerSeconds)}</div>
            <div id="currentPresenter">{currentPresenter.name}</div>
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
                {isRunning && (<th>Total time</th>)}
                {isAdmin && !isRunning && (<th>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {presenters.map((presenter, index) => (
                <tr key={presenter.id}>
                  <td>{index + 1}</td>
                  <td>{presenter.name}</td>
                  <td>{presenter.duration} min</td>
                  {isRunning && (
                    <td>{formatTime(totalTimes[presenter.id] || 0)}</td>
                  )}
                  {isAdmin && !isRunning && (
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
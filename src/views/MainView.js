import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { auth } from "../firebase/firebaseConfig";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, onSnapshot, doc, deleteDoc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import './../styles/MainView.css';
import LogoutIcon from './../resources/icons/logout.svg';
import MuteIcon from './../resources/icons/mute.svg';
import UnmuteIcon from './../resources/icons/unmute.svg';
import ClapSound from './../resources/sounds/claps.mp3';
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
  const [totalTimes, setTotalTimes] = useState({});
  const [currentStopwatchValues, setCurrentStopwatchValues] = useState({});

  // Mute State
  const [isMuted, setIsMuted] = useState(false);

  // Clap Emoji State
  const [claps, setClaps] = useState([]);
  const clapSoundRef = useRef(null);

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
  const TIMER_DOC_ID = "currentTimerState";
  const timerDocRef = doc(db, "timerStates", TIMER_DOC_ID);
  const sessionsCollectionRef = collection(db, "sessions");
  const actionsDocRef = doc(db, "actions", "currentAction");

  const updateTimerStateInFirebase = useCallback(async (updates) => {
    try {
      await updateDoc(timerDocRef, updates);
    } catch (error) {
      console.error("Error updating timer state in Firebase:", error);
    }
  }, []);

  const startTimer = useCallback(() => {
    if (presenters.length === 0) return;
    const initialPresenter = presenters[0];

    const initialState = {
      currentPresenterIndex: 0,
      timerSeconds: initialPresenter.duration * 60,
      stopwatchSeconds: 0,
      isRunning: true
    };

    updateTimerStateInFirebase(initialState);
    setCurrentStopwatchValues(prevValues => ({
      ...prevValues,
      [initialPresenter.id]: 0,
    }));
    setTotalTimes({});

  }, [presenters, updateTimerStateInFirebase]);

  const archiveSession = useCallback(async (sessionData) => {
    try {
      await addDoc(sessionsCollectionRef, sessionData);
    } catch (error) {
      console.error("Error archiving session:", error);
    }
  }, []);

  const resetTotalTimes = useCallback(async () => {
    try {
      await updateDoc(timerDocRef, { totalTimes: {} });
      setTotalTimes({});
    } catch (error) {
      console.error("Error resetting totalTimes in Firebase:", error);
    }
  }, []);

  const nextPresenter = useCallback(async () => {
    if (!isRunning) return;

    const currentPresenterId = presenters[currentPresenterIndex].id;

    setCurrentStopwatchValues(prevValues => ({
      ...prevValues,
      [currentPresenterId]: stopwatchSeconds,
    }));

    updateTimerStateInFirebase({
        [`totalTimes.${currentPresenterId}`]: stopwatchSeconds,
    });
    setTotalTimes(prevTimes => ({
      ...prevTimes,
      [currentPresenterId]: stopwatchSeconds
    }));

    const nextIndex = currentPresenterIndex + 1;

    if (nextIndex < presenters.length) {
      const nextPresenter = presenters[nextIndex];
      const nextState = {
        currentPresenterIndex: nextIndex,
        timerSeconds: nextPresenter.duration * 60,
        stopwatchSeconds: 0,
      };
      updateTimerStateInFirebase(nextState);

      setCurrentStopwatchValues(prevValues => ({
        ...prevValues,
        [nextPresenter.id]: 0,
      }));

    } else {
      // Preparing session Data
      const sessionData = presenters.map(presenter => ({
        name: presenter.name,
        duration: presenter.duration,
        totalTime: totalTimes[presenter.id] || 0,
        date: new Date().toISOString()
      }));

      // Storing session data to "sessions" collection
      await archiveSession({sessionData});

      // Resetting the timer state
      const finishState = {
        isRunning: false,
        currentPresenterIndex: null,
        timerSeconds: 0,
        stopwatchSeconds: 0,
      };
      updateTimerStateInFirebase(finishState);

      // Resetting totalTimes
      await resetTotalTimes();

      setCurrentStopwatchValues(prevValues => ({
        ...prevValues,
        [currentPresenterId]: stopwatchSeconds,
      }));
    }
  }, [currentPresenterIndex, presenters, isRunning, stopwatchSeconds, updateTimerStateInFirebase, totalTimes, archiveSession, resetTotalTimes]);

    // Mute/Unmute Logic
    const toggleMute = useCallback(() => {
      setIsMuted((prevMuted) => !prevMuted);
    }, []);

    useEffect(() => {
      if (clapSoundRef.current) {
        clapSoundRef.current.muted = isMuted;
      }
    }, [isMuted]);

    // Clap Logic
    const triggerClap = useCallback(() => {
        if (clapSoundRef.current) {
            clapSoundRef.current.play().catch(error => console.log("Playback prevented:", error));
        }

        const newClaps = Array.from({ length: 25 }, (_, index) => ({
            id: Date.now() + index,
            x: Math.random() * 80 + 10,
            y: Math.random() * 50 + 20,
            directionX: Math.random() * 2 - 1,
            directionY: Math.random() * 2 - 1,
            opacity: 1,
        }));
        setClaps(newClaps);
    }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(timerDocRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setCurrentPresenterIndex(data.currentPresenterIndex !== undefined ? data.currentPresenterIndex : null);
        setTimerSeconds(data.timerSeconds !== undefined ? data.timerSeconds : 0);
        setStopwatchSeconds(data.stopwatchSeconds !== undefined ?  data.stopwatchSeconds : 0);
        setIsRunning(data.isRunning !== undefined ? data.isRunning : false);
        setTotalTimes(data.totalTimes !== undefined ? data.totalTimes : {});
      } else {
        console.log("Timer document does not exist. Initializing...");
        try {
          await setDoc(timerDocRef, {
            currentPresenterIndex: null,
            timerSeconds: 0,
            stopwatchSeconds: 0,
            isRunning: false,
            totalTimes: {}
          });
          setTotalTimes({});
        } catch (error) {
          console.error("Error creating timer state document in Firebase:", error);
        }
      }
    });

      const unsubscribeActions = onSnapshot(actionsDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data.type === 'clap') {
            triggerClap();
          }
        }
      });

    return () => {
        unsubscribe();
        unsubscribeActions();
    };
  }, [updateTimerStateInFirebase, triggerClap]);

  // useEffect for Timer interval
  useEffect(() => {
    let interval = null;

    if (isRunning && currentPresenterIndex !== null) {
      interval = setInterval(() => {
        setTimerSeconds((prevSeconds) => prevSeconds - 1);
        setStopwatchSeconds((prevSeconds) => prevSeconds + 1);

        const currentId = presenters[currentPresenterIndex].id;
        setCurrentStopwatchValues(prevValues => ({
          ...prevValues,
          [currentId]: stopwatchSeconds,
        }));

        updateTimerStateInFirebase({
          timerSeconds: timerSeconds - 1,
          stopwatchSeconds: stopwatchSeconds + 1,
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRunning, currentPresenterIndex, presenters, stopwatchSeconds, timerSeconds, updateTimerStateInFirebase]);

    // Emoji Animation Effect
    useEffect(() => {
      const animationInterval = setInterval(() => {
          setClaps(currentClaps => {
              return currentClaps.map(clap => {
                  const newOpacity = clap.opacity - 0.02;
                  return {
                      ...clap,
                      x: clap.x + clap.directionX,
                      y: clap.y + clap.directionY - 0.5,
                      opacity: newOpacity > 0 ? newOpacity : 0,
                  };
              }).filter(clap => clap.opacity > 0);
          });
      }, 20);

      return () => clearInterval(animationInterval);
    }, []);

  const formatTime = (seconds) => {
    const minutes = Math.abs(Math.floor(seconds / 60));
    const remainingSeconds = Math.abs(seconds % 60);
    const sign = seconds < 0 ? "+" : "";
    return `${sign}${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const timerStyle = {
    color: timerSeconds < 0 ? 'red' : 'black'
  };

  const currentPresenter = useMemo(() => {
    return currentPresenterIndex !== null ? presenters[currentPresenterIndex] : null;
  }, [currentPresenterIndex, presenters]);

  const getRowStyle = useCallback((index) => {
    if (isRunning && currentPresenterIndex === index) {
      return { backgroundColor: '#c8e6c9' };
    }
    return {};
  }, [isRunning, currentPresenterIndex]);

    const publishClap = useCallback(async () => {
      try {
        await setDoc(actionsDocRef, { type: 'clap', timestamp: Date.now() });
      } catch (error) {
        console.error("Error publishing clap action to Firebase:", error);
      }
    }, []);

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
          <div id="header">
            <img src={LogoutIcon} alt="logout" id="logoutButton" className="headerIcons" onClick={handleLogout} />
            <button id="clapButton" onClick={publishClap}>👏</button>
              <img
                src={isMuted ? UnmuteIcon : MuteIcon}
                alt="mute"
                id="muteButton"
                className="headerIcons"
                onClick={toggleMute}
              />
             <audio ref={clapSoundRef} src={ClapSound} preload="auto" muted={isMuted} />
          </div>
          <div className="claps-container">
            {claps.map(clap => (
              <span
                key={clap.id}
                className="clap-emoji"
                style={{
                  left: `${clap.x}%`,
                  top: `${clap.y}%`,
                  opacity: clap.opacity,
                  position: 'absolute',
                  fontSize: '3em',
                  pointerEvents: 'none',
                }}
              >
                👏
              </span>
            ))}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Duration</th>
                {isRunning && currentPresenter && (<th>Total time</th>)}
                {isAdmin && !isRunning && (<th>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {presenters.map((presenter, index) => (
                <tr key={presenter.id} style={getRowStyle(index)}>
                  <td>{index + 1}</td>
                  <td>{presenter.name}</td>
                  <td>{presenter.duration} min</td>
                  {isRunning && currentPresenter && (<td>{formatTime(currentStopwatchValues[presenter.id] || totalTimes[presenter.id] || 0)}</td>)}
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
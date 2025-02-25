import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import RoleSelection from "./views/RoleSelection";
import AdminLogin from "./views/AdminLogin";
import MainView from "./views/MainView";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/main-view" element={<MainView />} />
      </Routes>
    </Router>
  );
}

export default App;

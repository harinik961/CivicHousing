import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import Home from "./pages/home";
import Community from "./pages/Communities/Community";
import Housing from "./pages/Housing/Housing";
import Transportation from "./pages/Transportation/Transportation";
import About from "./pages/About";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/community" element={<Community />} />
        <Route path="/housing" element={<Housing />} />
        <Route path="/transportation" element={<Transportation />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;

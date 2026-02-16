import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/home";
import Community from "./pages/Community";
import Housing from "./pages/Housing";
import Transportation from "./pages/Transportation";
function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/community" element={<Community />} />
        <Route path="/housing" element={<Housing />} />
        <Route path="/transportation" element={<Transportation />} />
      </Routes>
    </Router>
  );
}

export default App;

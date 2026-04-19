import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from "./components/Navbar";
import Home from "./pages/home";
import Community from "./pages/Communities/Community";
import Housing from "./pages/Housing/Housing";
import Transportation from "./pages/Transportation/Transportation";
import Visualizations from "./pages/Visualizations";
import ProviderVisualizations from "./pages/ProviderVisualizations";
import GlobalSearch from "./pages/GlobalSearch"
import About from "./pages/About";
import HousingInstance from "./pages/Housing/HousingInstance";
import TransportationInstance from "./pages/Transportation/Transport-Instance";
import CommunityInstance from "./pages/Communities/Community-Instance";
import "./components/instance.css";
import NLQuery from "./pages/NLQuery";

function App() {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/community" element={<Community />} />
        <Route path="/housing" element={<Housing />} />
        <Route path="/transportation" element={<Transportation />} />
        <Route path="/visualizations" element={<Visualizations />} />
        <Route path="/provider-visualizations" element={<ProviderVisualizations />} />
        <Route path="/globalsearch" element={<GlobalSearch />} />
        <Route path="/about" element={<About />} />
        <Route path="/housing/:id" element={<HousingInstance />} />
        <Route path="/community/:id" element={<CommunityInstance />} />
        <Route path="/transportation/:id" element={<TransportationInstance />} />
        <Route path="/nl-query" element={<NLQuery />} />
      </Routes>
    </Router>
  );
}

export default App;

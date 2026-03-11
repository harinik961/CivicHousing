import React, { useEffect, useState } from "react";
import "./About.css";
import cocoImage from "../media/coco.jpg";
import matthewImage from "../media/matthew.jpg";
import aarshiImage from "../media/aarshi.jpg";
import hariniImage from "../media/harini.jpg";
import alexImage from "../media/alexander.jpg";


function TeamMemberCard({name, image, bio, responsibilities, commits, issues, tests}) {
  return(
    <div className="member-card">
      <div className="image-header">
        <img src={image} alt={name} className="member-img"></img>
      </div>
      <div className="card-body">
        <h5 className="member-name">{name}</h5>
        <h5>Bio:</h5>
        <p className="bio">{bio}</p>
        <h5>Responsibilities:</h5>
        <p>{responsibilities}</p>
        <div className="member-stats">
          <span>Commits: {commits}</span>{" | "}
          <span>Closed Issues: {issues}</span>{" | "}
          <span>Unit Tests: {tests}</span>
        </div>
      </div>
    </div>
  );
}

  const team = [
  {
    name: "Coco Zhou", 
    username: "oxcoco",
    email: ["cocozhou@utexas.edu", "cocozhou62405@gmail.com"],
    image: cocoImage, 
    bio: "I'm a Junior studying Computer Science and Mathematics at UT Austin. I enjoy sleeping, reading, and playing Minecraft in my free time.", 
    responsibilities: "Fullstack: Data Scrape, Server Hosting, About Page, Navbar",
    tests: 16
  }, 
  {
    name: "Matthew Pham", 
    username: "matthewpham16",
    email: ["mattpham016@gmail.com"],
    image: matthewImage, 
    bio: "I'm a junior studying CS with a minor in SDS and Business at UT. I love staying active, chilling with friends, and enjoying the outdoors.", 
    responsibilities: "Fullstack: Data Scrape, Home Page, Postman API",
    tests: 0
  }, 
  {
    name: "Aarshi Khatiwada", 
    username: "rckhatiwada1271",
    email: ["rckhatiwada1271@gmail.com"],
    image: aarshiImage, 
    bio: "I'm a senior studying Computer Science and minoring in Business. I enjoy true crime podcasts, learning about psychology, and trying new foods.",
    responsibilities: "Fullstack: Database, Framework for Models and Instances",
    tests: 0
  }, 
  {
    name: "Sri Harini Kolluru", 
    username: "sriharini.kolluru",
    email: ["harinik961@gmail.com"],
    image: hariniImage, 
    bio: "I'm a Sophomore studying computer science and entreprenuership at UT Austin. I enjoy art, photography, and reading in my free time .", 
    responsibilities: "Fullstack: Data Scrape, Models and Instances",
    tests: 12
  }, 
  {
    name: "Alexander Nguyen", 
    username: "alexandernguyen1504",
    email: ["alexandernguyen@alexanders-macbook-air.local", "alexandernguyen@wireless-10-154-160-87.public.utexas.edu", 
      "alexandernguyen@wireless-10-145-5-207.public.utexas.edu", "alexandernguyen@wireless-10-148-206-55.public.utexas.edu", 
      "alexandernguyen@utexas.edu"],
    image: alexImage, 
    bio: "I'm a Junior studying computer science at UT Austin. I enjoy sports, hanging out with friends, and trying new food spots in my free time.", 
    responsibilities: "Fullstack: Data Scrape, Models and Instances",
    tests: 0
  }
];
export default function About() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    async function fetchStats() {
      
      async function fetchData(url) {
        let allData = [];
        let page = 1;
        while (true) {
          const res = await fetch(`${url}&page=${page}`);
          if (!res.ok)
            break;
          const data = await res.json();
          if (!data.length) 
            break;
          allData = allData.concat(data);
          page++;
        }
        return allData
      }

      const [issues, commits] = await Promise.all([
        fetchData("https://gitlab.com/api/v4/projects/79423455/issues?per_page=100&state=all"), 
        fetchData("https://gitlab.com/api/v4/projects/79423455/repository/commits?per_page=100")
      ]);

      // Initializes stats for every member, including number of tests
      const stats = {};
      team.forEach(member => {
        stats[member.username] = {
          commits: 0,
          issues: 0,
          tests: member.tests || 0
        };
      });

      // Finds number of closed issues
      issues.forEach(issue => {
        if (issue.closed_by && stats[issue.closed_by.username]) {
          stats[issue.closed_by.username].issues += 1;
        }
      });

      // Finds number of commits
      commits.forEach(commit => {
        const member = team.find(
          m => m.email.some(email => 
            email.toLowerCase() === commit.author_email.toLowerCase()
          )
        );
        if (member) stats[member.username].commits += 1;
      });

      setStats(stats);
    }

    fetchStats();
  }, []);

  const totalCommits = Object.values(stats).reduce((sum, m) => sum + (m.commits || 0), 0);
  const totalIssues = Object.values(stats).reduce((sum, m) => sum + (m.issues || 0), 0);
  const totalTests = Object.values(stats).reduce((sum, m) => sum + (m.tests || 0), 0);

  return (
    <div className="about-container">

      {/* About Blurb */}
      <div className="about-top-section">
        <h1 className="title">About CivicHousing</h1>
        <p className="about-blurb">
          CivicHousing is a data-driven web platform that highlights affordable housing availability and transportation accessibility gaps across Austin, Texas.
          It integrates public housing inventory data, transit infrastructure data, sidewalk and walkability metrics, and community-level indicators to reveal where affordability and mobility intersect, or fail to.
          By mapping the relationship between lower-income housing, public transportation density, and neighborhood accessibility, the platform empowers residents, planners, and policymakers to identify 
          transit-accessible affordable housing, evaluate safety and walkability, and uncover inequities in urban development.
        </p>
      </div>

      {/* Disparate Data Blurb */}
      <div>
        <h2 className="subtitle">Disparate Data Result</h2>
        <p className="text-section">
          By integrating disparate data on affordable housing, public transportation routes, walkability metrics, and community-level indicators, 
          our platform reveals patterns that are difficult to observe when examining each dataset separately. 
          One notable result is that many affordable housing locations in Austin are situated in areas with fewer nearby transit routes
          and lower walkability scores. This suggests a potential gap between housing affordability and transportation accessibility, 
          meaning residents in lower-cost housing may still face barriers to reaching jobs, services, and amenities.
        </p>
      </div>

      {/* Team Members */}
      <div className="team-section">
        <h2 className="subtitle">Our Team</h2>
        <div className="team-cards">
          {team.map(member =>(
            <TeamMemberCard
              key={member.username}
              {...member}
              commits={stats[member.username]?.commits || 0}
              issues={stats[member.username]?.issues || 0}
              tests={stats[member.username]?.tests || 0}
            />
          ))} 
        </div>
      </div>

      {/* Project Stats */}
      <div className="project-stats">
        <h2 className="subtitle">Project Stats</h2>
        <p>
          Total Commits: {totalCommits} {" | "}
          Total Closed Issues: {totalIssues} {" | "}
          Total Unit Tests: {totalTests}
        </p>
      </div>

      {/* List of Tools Used */}
      <div className="tools-section">
        <h2 className="subtitle">Tools Used</h2>
        <ul className="text-section">
          <li><strong>GitLab:</strong> Used for Git repository management, CI/CD, and project management through issues. <br /></li>
          <li><strong>React:</strong> Frontend framework used to build our dynamic and responsive web application. <br /></li>
          <li><strong>Postman:</strong> API development platform used to design, document, and test the RESTful API for this website.<br /></li>
          <li><strong>AWS Amplify:</strong> Cloud platform used to host our website frontend.<br /></li>
          <li><strong>AWS Elastic Beanstalk:</strong> Cloud platform used to host our website backend.<br /></li>
          <li><strong>AWS RDS:</strong> Cloud platform used to host our database.<br /></li>
          <li><strong>Flask:</strong> Web framework for our backend server.<br /></li>
          <li><strong>Docker:</strong> Containerization platform used to package the backend application and its dependencies into reproducible environments.<br /></li>
          <li><strong>Mocha:</strong> JavaScript testing framework used for running frontend unit tests.<br /></li>
          <li><strong>unittest:</strong> Python testing framework used to write and run backend unit tests.<br /></li>
          <li><strong>Selenium:</strong> Browser automation tool used for end-to-end testing of the web application interface.<br /></li>
        </ul>
      </div>

      {/* Github Repo & API Documentation */}
      <div className="links-section">
        <h2 className="subtitle">Useful Links</h2>
        <div className="links-wrapper">
          <div className="link-box">
            <a href="https://gitlab.com/matthewpham16/cs373-spring-2026-53380_06" target="_blank" rel="noopener noreferrer">Project Repository</a>
          </div>
          <div className="link-box">
            <a href="https://documenter.getpostman.com/view/52514232/2sBXcDHMyK" target="_blank" rel="noopener noreferrer">API Documentation</a> 
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="data-source-section"> 
        <h2 className="subtitle">Data Sources</h2>
        <ul className="data-sources">
          <li>
            <a href="https://mapsplatform.google.com/lp/maps-apis/" target="_blank" rel="noopener noreferrer">Google Maps API</a>
          </li>
          <li>
            <a href="https://www.census.gov/data/developers/data-sets.html#accordion-a8ec3eb6f0-item-3c3bf7b7cd" target="_blank" rel="noopener noreferrer">Census API</a>
          </li>
          <li>
            <a href="https://data.austintexas.gov/Housing-and-Real-Estate/Affordable-Housing-Inventory/ifzc-3xz8/about_data" target="_blank" rel="noopener noreferrer">Austin Affordable Housing Data</a>
          </li>
          <li>
            <a href="https://data.texas.gov/dataset/CapMetro-GTFS/r4v4-vz24/about_data" target="_blank" rel="noopener noreferrer">CapMetro Data</a>
          </li>
          <li>
            <a href="https://www.walkscore.com/professional/api.php" target="_blank" rel="noopener noreferrer">WalkScore API</a>
          </li>
          <li>
            <a href="https://www.zillow.com/research/data/" target="_blank" rel="noopener noreferrer">Zillow Data</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
import React, { useEffect } from "react";
import "./About.css"

function TeamMemberCard({name, image, bio, responsibilities, commits, issues, tests}) {
  return(
    <div className="member-card">
      <div className="image-header">
        <img src={image} alt={name} className="member-img"></img>
      </div>
      <div className="card-body">
        <h5 className="member-name">{name}</h5>
        <h5>Bio:</h5>
        <p>{bio}</p>
        <h5>Responsibilities:</h5>
        <p>{responsibilities}</p>
        <h5>Stats:</h5>
        <div className="member-stats">
          <span>Commits: {commits}</span>
          <span>Issues: {issues}</span>
          <span>Tests: {tests}</span>
        </div>
      </div>
    </div>
  );
}

export default function About() {
  const team = [
    {
      name: "Coco Zhou", 
      username: "oxcoco",
      email: "cocozhou62405@gmail.com",
      image: "../media/coco.jpg", 
      bio: "Coco's temporary bio.", 
      responsibilities: "About Page",
    }, 
    {
      name: "Matthew Pham", 
      username: "matthewpham16",
      email: "map7578@my.utexas.edu",
      image: "../media/temp_pfp.png", 
      bio: "Matthew's temporary bio.", 
      responsibilities: "Home Page",
    }, 
    {
      name: "Aarshi Khatiwada", 
      username: "rckhatiwada1271",
      email: "ak48827@my.utexas.edu",
      image: "../media/aarshi.jpg", 
      bio: "Aarshi's temporary bio.", 
      responsibilities: "Models and Instances",
    }, 
    {
      name: "Sri Harini Kolluru", 
      username: "sriharini.kolluru",
      email: "sk59945@my.utexas.edu",
      image: "../media/harini.jpg", 
      bio: "Sri's temporary bio.", 
      responsibilities: "Models and Instances",
    }, 
    {
      name: "Alexander Nguyen", 
      username: "alexandernguyen1504",
      email: "aln2284@my.utexas.edu",
      image: "../media/alexander.jpg", 
      bio: "Alexander's temporary bio.", 
      responsibilities: "Models and Instances",
    }
  ];

  useEffect(() => {
    async function fetchStats() {

    }

    fetchStats();
  }, []);

  return (
    <div className="about-container">
      <div className="about-top-section">
        <h1 className="title">About CivicHousing</h1>
        <p className="about-blurb">
          CivicHousing is a data-driven web platform that highlights affordable housing availability and transportation accessibility gaps across Austin, Texas.
          It integrates public housing inventory data, transit infrastructure data, sidewalk and walkability metrics, and community-level indicators to reveal where affordability and mobility intersect, or fail to.
          By mapping the relationship between lower-income housing, public transportation density, and neighborhood accessibility, the platform empowers residents, planners, and policymakers to identify 
          transit-accessible affordable housing, evaluate safety and walkability, and uncover inequities in urban development.
        </p>
      </div>
      <div className="team-section">
        <h2 className="subtitle">Our Team</h2>
      </div>
      <div className="tools-section">
        <h2 className="subtitle">Tools Used</h2>
        <ul className="text-section">
          <li><strong>GitLab:</strong> Used for Git repository management, CI/CD, and project management through issues. <br /></li>
          <li><strong>React:</strong> Frontend framework used to build our dynamic and responsive web application. <br /></li>
          <li><strong>Postman:</strong> API development platform used to design and document the RESTful API for this website.<br /></li>
          <li><strong>AWS:</strong> Cloud platform used to host our website.<br /></li>
        </ul>
      </div>
      <div className="links-section">
        <h2 className="subtitle">Useful Links</h2>
        <div className="links-wrapper">
          <div className="link-box">
            <a href="https://gitlab.com/matthewpham16/cs373-spring-2026-53380_06" target="_blank">Project Repository</a>
          </div>
          <div className="link-box">
            <a href="https://mapsplatform.google.com/lp/maps-apis/" target="_blank">API Documentation</a> 
            {/* TODO: REMEMBER TO REPLACE WITH POSTMAN API LINK */}
          </div>
        </div>
      </div>
      <div className="data-source-section"> 
        <h2 className="subtitle">Data Sources</h2>
        <ul className="data-sources">
          <li>
            <a href="https://mapsplatform.google.com/lp/maps-apis/" target="_blank">Google Maps API</a>
          </li>
          <li>
            <a href="https://www.census.gov/data/developers/data-sets.html#accordion-a8ec3eb6f0-item-3c3bf7b7cd" target="_blank">Census API</a>
          </li>
          <li>
            <a href="https://data.austintexas.gov/Housing-and-Real-Estate/Affordable-Housing-Inventory/ifzc-3xz8/about_data" target="_blank">Austin Affordable Housing Data</a>
          </li>
          <li>
            <a href="https://data.texas.gov/dataset/CapMetro-GTFS/r4v4-vz24/about_data" target="_blank">CapMetro Data</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
## AI Interaction Report

## Summary of AI Interactions

## Tools Used
- Claude (Anthropic) — via claude.ai
- ChatGPT 

## How AI Was Used

Debugging Help
- Resolved a PowerShell execution policy error preventing npm from running
- Fixed a `Cannot read properties of undefined (reading 'length')` error in 
  ModelCard.js caused by restructuring the data format
- When working on yml file to automatically build and push, we were having errors when running the pipeline, and I used chatgpt to help debug what the issue could be. 
- * Helped debug and fix  routing between model and instance pages by identifying a missing `modelName` prop, which resolved the `/undefined/1` navigation issue and enabled proper linking across all models


Conceptual Clarification
- Understood why GET requests should not have a body in REST API design
- Learned the difference between hot reloading vs restarting the dev server

Code Improvement
- Built out the home page carousel using React Bootstrap's Carousel component with
  background images and overlay text
- Restructured model data files from a flat attributes string array to a proper
  key-value object format for better scalability
- Updated ModelCard.js to use a per-model attribute map instead of relying on string splitting

UI Layout and Masonry Implementation
- Helped implement a masonry style layout for the instance   pages so cards would flow naturally instead of stacking in rigid rows


## Reflection on Use

What specific improvements came from AI interaction?

The carousel section of the home page was heavily guided by AI. AI helped set 
up the React Bootstrap Carousel component with overlay text and buttons linking 
to each model page.

With the help of AI interaction I was able to understand what may be failing our pipeline, and it was due to our package-lock.json not having updated information from whenever we do npm install because it doesn't save react-scripts and that was breaking when running the pipeline. So based on it's inputs I ran npm install with  --save-dev react-scripts and pushed the package-lock file with the updated information. 

How did you decide what to keep or ignore?

The carousel was initially made with solid background colors for each 
slide. After seeing how plain it looked, I replaced them with real Austin 
background images by changing the CSS from `background-color` to 
`background-image` with actual photo URLs. The base URL for the API was also 
changed from the AI's initial suggestion of `api.civichousing.me` to 
`civichousing.me/api` after discussing it with the team.
To decide what to keep or ignore, I would ask it to clarify what something may mean before doing it and then discussing with my teammates before making any changes.  

**Did the AI ever produce incorrect suggestions?**
Yes — AI initially suggested restructuring the model data to use flat fields, 
but another team member had already updated the repo to use a `{title, value}` 
object format. This was caught by comparing the AI output against the actual 
repo and the data format was adjusted to stay consistent with the team's code.
It took the AI some time to figure out what may be the issue with npm install, but it eventually worked. 

## Evidence of Independent Work

**Before:**
```css
.slide-1 { background-color: #2c3e50; }
.slide-2 { background-color: #1a5276; }
.slide-3 { background-color: #1e8449; }
```

**After:**
```css
.slide-1 { background-image: url("https://images.unsplash.com/..."); }
.slide-2 { background-image: url("https://images.unsplash.com/..."); }
.slide-3 { background-image: url("https://..."); }
```




**Before:**

<div className="row">
  <div className="col-md-6">
    <InstanceCard>...</InstanceCard>
  </div>
  <div className="col-md-6">
    {attributes.map(...)}
  </div>
</div>


**After:**

<div className="masonry">
  <div className="masonry-item">
    <InstanceCard>...</InstanceCard>
  </div>

  {attributes.map(...)}

  <div className="masonry-item">...</div>
</div>

```

This change taught me that CSS background images require `background-size: cover` 
and `background-position: center` to display properly, and that swapping colors 
for real images makes a significant visual difference on a landing page.
**Before:**
  script:
    - cd frontend
    - npm ci
    - npm run build

**After:**
  script:
    - cd frontend
    - npm install --include=dev
    - npm run build
This change taught me more first hand about how something may run properly in your local machine but it could break on others.

## Integrity Statement

AI was used as a helper for debugging, explaining concepts, and generating 
sections of the home page including the carousel. Suggestions that conflicted 
with the team's existing code were identified and adjusted. All final decisions 
on what to keep, change, or discard were made by me after reviewing the output.
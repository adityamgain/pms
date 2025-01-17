:root {
    --accent-color: #131313;
    --bg-light: #f4f4f4;
    --text-color: #ffffff;
    --highlight: #007bff;
    --highlight-hover: #0056b3;
  }
  
  body {
    font-family: 'Lato', sans-serif;
    margin: 0;
    display: grid;
    grid-template-columns: 260px 1fr;
    height: 100vh;
    background-color: var(--accent-color);
    color: var(--text-color);
  }
  
  .sidenav {
    background-color: var(--accent-color);
    padding: 16px;
    position: fixed;
    width: 260px;
    height: 100vh;
    transition: width 0.3s;
  }
  
  .sidenav.collapsed {
    width: 80px;
  }
  
  .sidenav_header {
    margin-bottom: 16px;
  }
  
  .sidenav_link {
    text-decoration: none;
    color: var(--text-color);
    padding: 10px;
    display: flex;
    align-items: center;
    border-radius: 8px;
  }
  
  .sidenav_link.active,
  .sidenav_link:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .sidenav_footer {
    margin-top: auto;
  }
  
  .sidenav i {
    margin-right: 10px;
  }
  
  #nav_collapse_btn {
    display: none;
  }
  
  main {
    padding: 16px;
    background-color: var(--bg-light);
    height: 100vh;
    overflow-y: auto;
  }
  
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--accent-color);
    color: var(--text-color);
    padding: 16px;
    position: sticky;
    top: 0;
    z-index: 1000;
  }
  
  .navbar .navbar_btn {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 24px;
    cursor: pointer;
  }
  
  .navbar_link {
    text-decoration: none;
    color: var(--text-color);
    margin-left: 16px;
  }
  
  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .button {
    text-decoration: none;
    background-color: var(--highlight);
    color: var(--text-color);
    padding: 10px 16px;
    border-radius: 8px;
    transition: background-color 0.3s;
  }
  
  .button:hover {
    background-color: var(--highlight-hover);
  }
  
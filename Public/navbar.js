function loadNavbar() {
    fetch('/navbar.html')
      .then(response => response.text())
      .then(data => {
        document.body.insertAdjacentHTML('afterbegin', data); 
        checkLoginStatus(); 
      });
  }
  

  function checkLoginStatus() {
    fetch('/check-login')
      .then(response => response.json())
      .then(data => {
        if (data.isLoggedIn) {
          document.getElementById('aboutLink').style.display = 'inline';
          document.getElementById('contactLink').style.display = 'inline';
          document.getElementById('officeHoursLink').style.display = 'inline';
          document.getElementById('rolesLink').style.display = 'inline';
          document.getElementById('logoutButton').style.display = 'inline';
        } else {
          document.getElementById('homeLink').style.display = 'inline';
        }
      });
  }
  
  function logout() {
    fetch('/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => {
        if (response.ok) {
          localStorage.setItem("isLoggedIn", "false")
          window.location.href = '/'; 
        }
      });
  }
  
  loadNavbar();
  
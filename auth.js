// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
      window.location.href = 'login.html';
  }
  return token;
}

// Login form handler
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
          const response = await fetch('http://localhost:5502/api/login', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, password })
          });

          const data = await response.json();

          if (data.token) {
              localStorage.setItem('token', data.token);
              localStorage.setItem('username', username);
              window.location.href = 'index.html';
          } else {
              document.getElementById('error-message').textContent = data.message || 'Login failed';
          }
      } catch (error) {
          document.getElementById('error-message').textContent = 'An error occurred';
      }
  });
}

// Signup form handler
if (document.getElementById('signup-form')) {
  document.getElementById('signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const errorElement = document.getElementById('error-message');
      
      // Clear previous errors and show loading state
      errorElement.style.display = 'none';
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="bi bi-hourglass me-2"></i>Signing up...';

      if (password !== confirmPassword) {
          errorElement.textContent = 'Passwords do not match';
          errorElement.style.display = 'block';
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
          return;
      }

      try {
          const response = await fetch('http://localhost:5502/api/signup', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, email, password })
          });

          const data = await response.json();

          if (data.success) {
              // Show success message before redirecting
              errorElement.className = 'alert alert-success mt-3';
              errorElement.textContent = 'Sign up successful! Redirecting to login...';
              errorElement.style.display = 'block';
              setTimeout(() => {
                  window.location.href = 'login.html';
              }, 1500);
          } else {
              errorElement.className = 'alert alert-danger mt-3';
              errorElement.textContent = data.message || 'Signup failed';
              errorElement.style.display = 'block';
              submitButton.disabled = false;
              submitButton.innerHTML = originalButtonText;
          }
      } catch (error) {
          errorElement.className = 'alert alert-danger mt-3';
          errorElement.textContent = 'Network error occurred. Please try again.';
          errorElement.style.display = 'block';
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
      }
  });
}
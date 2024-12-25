// Constants
const API_BASE_URL = 'http://localhost:5502/api';
const isDebugMode = true; // Set to false in production

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Display username
    const usernameDisplay = document.getElementById('username-display');
    const username = localStorage.getItem('username');
    if (username && usernameDisplay) {
        usernameDisplay.textContent = `Welcome, ${username}!`;
    }

    // Load dashboard data
    loadDashboardData();
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', function () {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
});

// Add authentication headers to all fetch requests
function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (isDebugMode) console.log('Token:', token);

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'block';

        if (isDebugMode) console.log('Fetching dashboard data...');
        const response = await authenticatedFetch(`${API_BASE_URL}/dashboard`);
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                alert('Session expired. Please log in again.');
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new TypeError("Oops, we haven't got JSON!");
        }

        const data = await response.json();
        if (isDebugMode) console.log('Dashboard data:', data);

        if (!data || !data.success) {
            throw new Error('No data received from server or request failed');
        }

        const dashboardData = data.data;
        updateSummaryCards(dashboardData);
        createPriorityChart(dashboardData);

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        clearCharts();
    } finally {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// Clear existing charts
function clearCharts() {
    const chart = Chart.getChart('priority-chart');
    if (chart) chart.destroy();
}

// Update summary cards with current statistics
function updateSummaryCards(data) {
    if (!data || !data.priorityDistribution) return;
    
    document.getElementById('total-tasks').textContent = data.totalTasks || 0;
    document.getElementById('very-important-tasks').textContent = data.priorityDistribution.veryImportant || 0;
    document.getElementById('important-tasks').textContent = data.priorityDistribution.important || 0;
    document.getElementById('not-important-tasks').textContent = data.priorityDistribution.notImportant || 0;
}

// Create the priority distribution pie chart
function createPriorityChart(data) {
    if (!data) return;
    
    clearCharts();
    
    const ctx = document.getElementById('priority-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Very Important', 'Important', 'Not Important'],
            datasets: [{
                data: [
                    data.priorityDistribution.veryImportant || 0,
                    data.priorityDistribution.important || 0,
                    data.priorityDistribution.notImportant || 0
                ],
                backgroundColor: [
                    'rgba(220, 53, 69, 0.8)',  // Very Important - Red
                    'rgba(255, 193, 7, 0.8)',  // Important - Yellow
                    'rgba(23, 162, 184, 0.8)'  // Not Important - Info
                ],
                borderColor: [
                    'rgba(220, 53, 69, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(23, 162, 184, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Task Priority Distribution'
                }
            }
        }
    });
}

// Helper function to generate priority badges
function getPriorityBadge(priority) {
    const priorityClass = (priority || '').replace(/\s+/g, '-').toLowerCase();
    const priorityColors = {
        'very-important': 'danger',
        'important': 'warning',
        'not-important': 'success'
    };
    return `<span class="badge bg-${priorityColors[priorityClass] || 'secondary'} rounded-pill" aria-label="${priority || 'Unknown'}">${priority || 'Unknown'}</span>`;
}

// Helper function to generate status badges
function getStatusBadge(completed) {
    return completed
        ? '<span class="badge bg-success status-badge" aria-label="Completed"><i class="bi bi-check-circle me-1"></i>Completed</span>'
        : '<span class="badge bg-warning status-badge" aria-label="Pending"><i class="bi bi-clock me-1"></i>Pending</span>';
}

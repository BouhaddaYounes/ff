// Check authentication on page load
document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  if (!token) {
      window.location.href = 'login.html';
      return;
  }

  // Display username
  const username = localStorage.getItem('username');
  document.getElementById('username-display').textContent = `Welcome, ${username}!`;

  // Load tasks
  fetch('http://localhost:5502/api/getAll', {
      headers: {
          'Authorization': `Bearer ${token}`
      }
  })
  .then(response => response.json())
  .then(data => loadHTMLTable(data['data']));
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', function() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  window.location.href = 'login.html';
});

// Add authentication headers to all fetch requests
function authenticatedFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
      ...options,
      headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`
      }
  });
}

// Update the event listener
document.querySelector('table tbody').addEventListener('click', function(event) {
    // Find the closest button if we clicked on an icon or span inside the button
    const button = event.target.closest('button');
    if (!button) return; // If we didn't click a button or its children

    if (button.classList.contains('delete-row-btn')) {
        deleteRowById(button.dataset.id);
    }
    if (button.classList.contains('edit-row-btn')) {
        handleEditRow(button.dataset.id);
    }
});

const updateBtn = document.querySelector('#update-row-btn');
const searchBtn = document.querySelector('#search-btn');

searchBtn.onclick = function() {
  const searchValue = document.querySelector('#search-input').value;
  authenticatedFetch('http://localhost:5502/api/search/' + searchValue)
  .then(response => response.json())
  .then(data => loadHTMLTable(data['data']));
}

function deleteRowById(id) {
  authenticatedFetch('http://localhost:5502/api/delete/' + id, {
      method: 'DELETE'
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          location.reload();
      }
  });
}

function handleEditRow(id) {
  const updateSection = document.querySelector('#update-row');
  const updateNameInput = document.querySelector('#update-name-input');
  const updatePriorityInput = document.querySelector('#update-priority-input');
  
  // Get current task values from the table row
  const taskRow = document.querySelector(`button[data-id="${id}"]`).closest('tr');
  const taskName = taskRow.querySelector('.task-name').textContent;
  const taskPriority = taskRow.querySelector('.priority-badge').getAttribute('data-priority') || 'not important';
  
  // Set current values in the update form
  updateNameInput.value = taskName;
  updatePriorityInput.value = taskPriority;
  updateNameInput.dataset.id = id;
  updateSection.hidden = false;
}

document.querySelector('#cancel-update-btn').addEventListener('click', function() {
  const updateSection = document.querySelector('#update-row');
  const updateNameInput = document.querySelector('#update-name-input');
  const updatePriorityInput = document.querySelector('#update-priority-input');
  
  // Clear form and hide update section
  updateNameInput.value = '';
  updatePriorityInput.value = 'not important';
  updateNameInput.dataset.id = '';
  updateSection.hidden = true;
});

updateBtn.onclick = function() {
  const updateNameInput = document.querySelector('#update-name-input');
  const updatePriorityInput = document.querySelector('#update-priority-input');
  
  authenticatedFetch(`http://localhost:5502/api/update/${updateNameInput.dataset.id}`, {
      method: 'PUT',
      headers: {
          'Content-type': 'application/json'
      },
      body: JSON.stringify({
          name: updateNameInput.value,
          priority: updatePriorityInput.value
      })
  })
  .then(response => response.json())
  .then(data => {
      if (data.success) {
          location.reload();
      }
  });
}

const addBtn = document.querySelector('#add-name-btn');

addBtn.onclick = function () {
  const nameInput = document.querySelector('#name-input');
  const priorityInput = document.querySelector('#priority-input');
  
  const name = nameInput.value;
  const priority = priorityInput.value;
  
  nameInput.value = "";
  priorityInput.value = "not important";

  authenticatedFetch('http://localhost:5502/api/insert', {
      headers: {
          'Content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ 
          name: name,
          priority: priority
      })
  })
  .then(response => response.json())
  .then(data => insertRowIntoTable(data['data']));
}

function getPriorityHTML(priority) {
    const priorityClass = priority.replace(/\s+/g, '-').toLowerCase();
    const priorityColors = {
        'very-important': 'danger',
        'important': 'warning',
        'not-important': 'success'
    };
    const badgeClass = `bg-${priorityColors[priorityClass]}`;
    
    return `
        <div class="d-flex align-items-center">
            <span class="badge ${badgeClass} rounded-pill priority-badge" data-priority="${priority}">${priority}</span>
        </div>
    `;
}

function getActionButtons(id) {
    return `
        <div class="d-flex gap-2 justify-content-center">
            <button class="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center edit-row-btn" data-id="${id}">
                <i class="bi bi-pencil-fill me-1"></i>
                <span>Edit</span>
            </button>
            <button class="btn btn-danger btn-sm rounded-pill px-3 d-flex align-items-center delete-row-btn" data-id="${id}">
                <i class="bi bi-trash-fill me-1"></i>
                <span>Delete</span>
            </button>
        </div>
    `;
}

function insertRowIntoTable(data) {
    const table = document.querySelector('table tbody');
    const isTableData = table.querySelector('.no-data');

    let tableHtml = "<tr>";
    tableHtml += `<td class="text-center">
                    <div class="form-check d-flex justify-content-center">
                        <input class="form-check-input task-check" type="checkbox" onchange="toggleTaskCompletion(this)" data-id="${data.id}">
                    </div>
                  </td>`;
    tableHtml += `<td class="text-center d-none">${data.id}</td>`;
    tableHtml += `<td><span class="task-name">${data.name}</span></td>`;
    tableHtml += `<td>${getPriorityHTML(data.priority)}</td>`;
    tableHtml += `<td><i class="bi bi-calendar-event text-muted me-1"></i>${new Date(data.dateAdded).toLocaleString()}</td>`;
    tableHtml += `<td>${getActionButtons(data.id)}</td>`;
    tableHtml += "</tr>";

    if (isTableData) {
        table.innerHTML = tableHtml;
    } else {
        const newRow = table.insertRow();
        newRow.innerHTML = tableHtml;
    }
}

function loadHTMLTable(data) {
    const table = document.querySelector('table tbody');

    if (data.length === 0) {
        table.innerHTML = "<tr><td class='no-data text-center text-muted' colspan='7'>No Data Available</td></tr>";
        return;
    }

    let tableHtml = "";

    data.forEach(function ({id, name, priority, date_added}) {
        tableHtml += "<tr>";
        tableHtml += `<td class="text-center">
                        <div class="form-check d-flex justify-content-center">
                            <input class="form-check-input task-check" type="checkbox" onchange="toggleTaskCompletion(this)" data-id="${id}">
                        </div>
                      </td>`;
        tableHtml += `<td class="text-center d-none">${id}</td>`;
        tableHtml += `<td><span class="task-name">${name}</span></td>`;
        tableHtml += `<td>${getPriorityHTML(priority)}</td>`;
        tableHtml += `<td><i class="bi bi-calendar-event text-muted me-1"></i>${new Date(date_added).toLocaleString()}</td>`;
        tableHtml += `<td>${getActionButtons(id)}</td>`;
        tableHtml += "</tr>";
    });

    table.innerHTML = tableHtml;
}

function toggleTaskCompletion(checkbox) {
    const taskNameElement = checkbox.closest('tr').querySelector('.task-name');
    if (checkbox.checked) {
        taskNameElement.style.textDecoration = 'line-through';
        taskNameElement.style.color = '#6c757d';
    } else {
        taskNameElement.style.textDecoration = 'none';
        taskNameElement.style.color = '';
    }
}
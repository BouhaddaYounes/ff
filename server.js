const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

dotenv.config();
const dbService = require('./dbService');

// Configure CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Debug middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    console.log('Authenticating token...');
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        console.log('No token found');
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Token verification failed:', err);
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        console.log('Token verified, user:', user);
        req.user = user;
        next();
    });
};

// API Routes
const apiRouter = express.Router();

// Dashboard data endpoint
apiRouter.get('/dashboard', authenticateToken, async (req, res) => {
    console.log('Dashboard API route hit');
    try {
        const db = dbService.getDbServiceInstance();
        const dashboardData = await db.getDashboardData(req.user.id);
        console.log('Dashboard data:', dashboardData);
        res.json({ success: true, data: dashboardData });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard data', error: error.message });
    }
});

// Login endpoint
apiRouter.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = dbService.getDbServiceInstance();
    
    try {
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET);
        res.json({ success: true, token, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Signup endpoint
apiRouter.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const db = dbService.getDbServiceInstance();
    
    try {
        // Check if user already exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.createUser(username, email, hashedPassword);
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        // Send more specific error message
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('username')) {
                res.status(400).json({ 
                    success: false, 
                    message: 'Username already exists'
                });
            } else if (error.message.includes('email')) {
                res.status(400).json({ 
                    success: false, 
                    message: 'Email already exists'
                });
            } else {
                res.status(400).json({ 
                    success: false, 
                    message: 'Username or email already exists'
                });
            }
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Error creating user: ' + error.message 
            });
        }
    }
});

// Other API routes
apiRouter.post('/insert', authenticateToken, async (request, response) => {
    const { name, priority } = request.body;
    const db = dbService.getDbServiceInstance();
    
    try {
        const data = await db.insertNewName(name, priority, request.user.id);
        response.json({ success: true, data });
    } catch (err) {
        console.error('Insert error:', err);
        response.status(500).json({ success: false, message: 'Error inserting data', error: err.message });
    }
});

apiRouter.get('/getAll', authenticateToken, async (request, response) => {
    const db = dbService.getDbServiceInstance();
    
    try {
        const data = await db.getAllData(request.user.id);
        response.json({ success: true, data });
    } catch (err) {
        console.error('Get all data error:', err);
        response.status(500).json({ success: false, message: 'Error retrieving data', error: err.message });
    }
});

apiRouter.put('/update/:id', authenticateToken, async (request, response) => {
    const { id } = request.params;
    const { name, priority, completed } = request.body;
    const db = dbService.getDbServiceInstance();
    
    try {
        const result = await db.updateNameById(id, name, priority, request.user.id, completed);
        if (result) {
            response.json({ success: true });
        } else {
            response.status(404).json({ success: false, message: 'Task not found or update failed' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        response.status(500).json({ success: false, message: error.message });
    }
});

apiRouter.put('/toggle-complete/:id', authenticateToken, async (request, response) => {
    const { id } = request.params;
    const { completed } = request.body;
    const db = dbService.getDbServiceInstance();
    
    try {
        // Get current task data
        const tasks = await db.searchByName('', request.user.id);
        const task = tasks.find(t => t.id === parseInt(id));
        if (!task) {
            return response.status(404).json({ success: false, message: 'Task not found' });
        }

        // Update task with new completion status
        const result = await db.updateNameById(id, task.name, task.priority, request.user.id, completed);
        if (result) {
            response.json({ success: true });
        } else {
            response.status(404).json({ success: false, message: 'Update failed' });
        }
    } catch (error) {
        console.error('Error toggling task completion:', error);
        response.status(500).json({ success: false, message: error.message });
    }
});

apiRouter.delete('/delete/:id', authenticateToken, async (request, response) => {
    const { id } = request.params;
    const db = dbService.getDbServiceInstance();
    
    try {
        const data = await db.deleteRowById(id, request.user.id);
        response.json({ success: true, data });
    } catch (err) {
        console.error('Delete error:', err);
        response.status(500).json({ success: false, message: 'Error deleting data', error: err.message });
    }
});

apiRouter.get('/search/:name', authenticateToken, async (request, response) => {
    const { name } = request.params;
    const db = dbService.getDbServiceInstance();
    
    try {
        const data = await db.searchByName(name, request.user.id);
        response.json({ success: true, data });
    } catch (err) {
        console.error('Search error:', err);
        response.status(500).json({ success: false, message: 'Error searching data', error: err.message });
    }
});

// Mount API routes under /api prefix
app.use('/api', apiRouter);

// Page Routes - Always serve index.html and let client-side routing handle it
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(5502, () => {
    console.log('Server is running on port 5502');
    console.log('API endpoints are available under /api');
});
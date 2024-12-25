const mysql = require('mysql');
const dotenv = require('dotenv');
let instance = null;
dotenv.config();

const connection = mysql.createConnection({
    user: "root",
    password: "",
    host: "localhost",
    port: 3306,
    database: "web_app"
});

connection.connect((err) => {
    if (err) {
        console.log(err.message);
    }
    console.log('db ' + connection.state);
});

class DbService {
    static getDbServiceInstance() {
        return instance ? instance : new DbService();
    }

    async createUser(username, email, password) {
        try {
            const insertId = await new Promise((resolve, reject) => {
                const query = "INSERT INTO users (username, email, password) VALUES (?, ?, ?);";
                connection.query(query, [username, email, password], (err, result) => {
                    if (err) reject(err);
                    resolve(result.insertId);
                });
            });
            return insertId;
        } catch (error) {
            throw error;
        }
    }

    async getUserByUsername(username) {
        try {
            const user = await new Promise((resolve, reject) => {
                const query = "SELECT * FROM users WHERE username = ?;";
                connection.query(query, [username], (err, results) => {
                    if (err) reject(err);
                    resolve(results[0]);
                });
            });
            return user;
        } catch (error) {
            throw error;
        }
    }

    async getAllData(userId) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT * FROM names WHERE user_id = ?;";
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error(err.message));
                    resolve(results);
                });
            });
            return response;
        } catch (error) {
            console.log(error);
        }
    }

    async insertNewName(name, priority, userId) {
        try {
            const dateAdded = new Date();
            const insertId = await new Promise((resolve, reject) => {
                const query = "INSERT INTO names (name, priority, date_added, user_id) VALUES (?,?,?,?);";
                connection.query(query, [name, priority, dateAdded, userId], (err, result) => {
                    if (err) reject(new Error(err.message));
                    resolve(result.insertId);
                });
            });
            return {
                id: insertId,
                name: name,
                priority: priority,
                dateAdded: dateAdded
            };
        } catch (error) {
            console.log(error);
        }
    }

    async deleteRowById(id, userId) {
        try {
            id = parseInt(id, 10); 
            const response = await new Promise((resolve, reject) => {
                const query = "DELETE FROM names WHERE id = ? AND user_id = ?";
                connection.query(query, [id, userId], (err, result) => {
                    if (err) reject(new Error(err.message));
                    resolve(result.affectedRows);
                });
            });
            return response === 1 ? true : false;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    async updateNameById(id, name, priority, userId) {
        try {
            id = parseInt(id, 10); 
            const response = await new Promise((resolve, reject) => {
                const query = "UPDATE names SET name = ?, priority = ? WHERE id = ? AND user_id = ?";
                connection.query(query, [name, priority, id, userId], (err, result) => {
                    if (err) reject(new Error(err.message));
                    resolve(result.affectedRows);
                });
            });
            return response === 1 ? true : false;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    async searchByName(name, userId) {
        try {
            const response = await new Promise((resolve, reject) => {
                const query = "SELECT * FROM names WHERE name LIKE ? AND user_id = ?;";
                connection.query(query, [`%${name}%`, userId], (err, results) => {
                    if (err) reject(new Error(err.message));
                    resolve(results);
                });
            });
            return response;
        } catch (error) {
            console.log(error);
        }
    }

    async getDashboardData(userId) {
        try {
            // Get total tasks count
            const totalTasks = await new Promise((resolve, reject) => {
                const query = "SELECT COUNT(*) as count FROM names WHERE user_id = ?;";
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting total tasks: ' + err.message));
                    resolve(results[0].count);
                });
            });

            // Get priority distribution
            const priorityDistribution = await new Promise((resolve, reject) => {
                const query = `
                    SELECT 
                        COUNT(CASE WHEN priority = 'not important' THEN 1 END) as notImportant,
                        COUNT(CASE WHEN priority = 'important' THEN 1 END) as important,
                        COUNT(CASE WHEN priority = 'very important' THEN 1 END) as veryImportant
                    FROM names 
                    WHERE user_id = ?;
                `;
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting priority distribution: ' + err.message));
                    resolve({
                        notImportant: results[0].notImportant || 0,
                        important: results[0].important || 0,
                        veryImportant: results[0].veryImportant || 0
                    });
                });
            });

            // Get tasks over time (last 7 days)
            const tasksOverTime = await new Promise((resolve, reject) => {
                const query = `
                    SELECT DATE(date_added) as date, COUNT(*) as count
                    FROM names 
                    WHERE user_id = ? 
                    AND date_added >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                    GROUP BY DATE(date_added)
                    ORDER BY date;
                `;
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting tasks timeline: ' + err.message));
                    
                    // Format the results
                    const dates = [];
                    const counts = [];
                    results.forEach(row => {
                        dates.push(new Date(row.date).toLocaleDateString());
                        counts.push(row.count);
                    });
                    
                    resolve({
                        dates: dates,
                        counts: counts
                    });
                });
            });

            // Get recent tasks
            const recentTasks = await new Promise((resolve, reject) => {
                const query = `
                    SELECT name, priority, date_added
                    FROM names 
                    WHERE user_id = ?
                    ORDER BY date_added DESC 
                    LIMIT 5;
                `;
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting recent tasks: ' + err.message));
                    resolve(results.map(task => ({
                        ...task,
                        date_added: new Date(task.date_added).toLocaleString()
                    })));
                });
            });

            // Combine all data
            return {
                totalTasks,
                completedTasks: 0, // Placeholder for future implementation
                pendingTasks: totalTasks,
                highPriorityTasks: priorityDistribution.veryImportant,
                priorityDistribution,
                tasksOverTime,
                recentTasks
            };
        } catch (error) {
            console.error('Error in getDashboardData:', error);
            throw error;
        }
    }
}

module.exports = DbService;
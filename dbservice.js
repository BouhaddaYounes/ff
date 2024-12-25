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
                const query = "INSERT INTO names (name, priority, date_added, user_id, completed) VALUES (?,?,?,?,?);";
                connection.query(query, [name, priority, dateAdded, userId, false], (err, result) => {
                    if (err) reject(new Error(err.message));
                    resolve(result.insertId);
                });
            });
            return {
                id: insertId,
                name: name,
                priority: priority,
                dateAdded: dateAdded,
                completed: false
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

    async updateNameById(id, name, priority, userId, completed) {
        try {
            id = parseInt(id, 10); 
            const response = await new Promise((resolve, reject) => {
                const query = "UPDATE names SET name = ?, priority = ?, completed = ? WHERE id = ? AND user_id = ?";
                connection.query(query, [name, priority, completed, id, userId], (err, result) => {
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
                    resolve(results && results[0] ? results[0].count : 0);
                });
            });

            // Get completed tasks count (add completed column if it doesn't exist)
            await new Promise((resolve, reject) => {
                const query = "SHOW COLUMNS FROM names LIKE 'completed';";
                connection.query(query, (err, results) => {
                    if (err) reject(err);
                    if (results.length === 0) {
                        connection.query("ALTER TABLE names ADD COLUMN completed BOOLEAN DEFAULT FALSE;", (err) => {
                            if (err) reject(err);
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });

            const completedTasks = await new Promise((resolve, reject) => {
                const query = "SELECT COUNT(*) as count FROM names WHERE user_id = ? AND completed = TRUE;";
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting completed tasks: ' + err.message));
                    resolve(results && results[0] ? results[0].count : 0);
                });
            });

            // Get high priority tasks count
            const highPriorityTasks = await new Promise((resolve, reject) => {
                const query = "SELECT COUNT(*) as count FROM names WHERE user_id = ? AND priority = 'very important';";
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting high priority tasks: ' + err.message));
                    resolve(results && results[0] ? results[0].count : 0);
                });
            });

            // Get priority distribution
            const priorityDistribution = await new Promise((resolve, reject) => {
                const query = `
                    SELECT 
                        priority,
                        COUNT(*) as count
                    FROM names 
                    WHERE user_id = ?
                    GROUP BY priority;
                `;
                connection.query(query, [userId], (err, results) => {
                    if (err) reject(new Error('Error getting priority distribution: ' + err.message));
                    const distribution = {
                        notImportant: 0,
                        important: 0,
                        veryImportant: 0
                    };
                    if (results) {
                        results.forEach(row => {
                            if (row.priority === 'not important') distribution.notImportant = row.count;
                            else if (row.priority === 'important') distribution.important = row.count;
                            else if (row.priority === 'very important') distribution.veryImportant = row.count;
                        });
                    }
                    resolve(distribution);
                });
            });

            return {
                totalTasks,
                completedTasks,
                highPriorityTasks,
                priorityDistribution
            };
        } catch (error) {
            console.error('Error in getDashboardData:', error);
            throw error;
        }
    }
}

module.exports = DbService;
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { translate } = require('google-translate-api-x'); // Add this line

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Gemini AI Configuration ---
// Make sure GEMINI_API_KEY is set in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Updated model name

const app = express();
const port = 3000;

// --- Create uploads directory if it doesn't exist ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files


// --- IMPORTANT: Update with your MySQL connection details ---
const dbConfig = {
    host: 'localhost',
    user: 'root', // Your MySQL username
    password: 'mahe1972', // Your MySQL password
    database: 'gramconnect',
    charset: 'utf8mb4'
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Villager Registration Endpoint
app.post('/register/villager', async (req, res) => {
    const { fullName, mobileNumber, latitude, longitude, aadhaarNumber, password, terms } = req.body;

    // Basic validation
    if (!fullName || !mobileNumber || !latitude || !longitude || !aadhaarNumber || !password || !terms) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        // Hash the password for security
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // SQL query to insert data
        const sql = `
            INSERT INTO villagers 
            (full_name, mobile_number, latitude, longitude, aadhaar_number, password_hash, terms_accepted) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [fullName, mobileNumber, latitude, longitude, aadhaarNumber, passwordHash, terms];

        // Execute the query
        await pool.query(sql, values);

        res.status(201).json({ success: true, message: 'Villager registered successfully!' });

    } catch (error) {
        console.error('Registration Error:', error);
        // Check for duplicate entry error (e.g., mobile or aadhaar)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Mobile number or Aadhaar number already exists.' });
        }
        res.status(500).json({ success: false, message: 'An error occurred during registration.' });
    }
});

// Villager Login Endpoint
app.post('/login/villager', async (req, res) => {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
        return res.status(400).json({ success: false, message: 'Mobile number and password are required.' });
    }

    try {
        // Find the villager by mobile number
        const sql = 'SELECT * FROM villagers WHERE mobile_number = ?';
        const [rows] = await pool.query(sql, [mobileNumber]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found. Please check your mobile number.' });
        }

        const villager = rows[0];

        const isMatch = await bcrypt.compare(password, villager.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        // Login successful, send back villager ID
        res.status(200).json({ 
            success: true, 
            message: 'Login successful!', 
            villagerId: villager.villager_id 
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});

// // --- Create New Request Endpoint ---
// app.post('/request/create', upload.single('problem_photo'), async (req, res) => {
//     const { villagerId, description } = req.body;
//     const photoPath = req.file ? req.file.path : null; // Get file path from multer

//     if (!villagerId || !description) {
//         return res.status(400).json({ success: false, message: 'Villager ID and description are required.' });
//     }

//     try {
//         const sql = `
//             INSERT INTO pendingRequests (villager_id, problem_description, problem_photo) 
//             VALUES (?, ?, ?)
//         `;
        
//         // Note: The description is stored as-is. Decryption would happen when an institution views it.
//         const values = [villagerId, description, photoPath];

//         await pool.query(sql, values);

//         res.status(201).json({ success: true, message: 'Request submitted successfully!' });

//     } catch (error) {
//         console.error('Request Creation Error:', error);
//         res.status(500).json({ success: false, message: 'An error occurred while submitting the request.' });
//     }
// });

// --- Create New Request Endpoint ---
app.post('/request/create', upload.single('problem_photo'), async (req, res) => {
    const { villagerId, description } = req.body;
    const photoPath = req.file ? req.file.path : null;

    if (!villagerId || !description) {
        return res.status(400).json({ success: false, message: 'Villager ID and description are required.' });
    }

    let finalDescription = description;
    let finalTags = null;

    try {
        console.log('Starting Gemini analysis...');

        const prompt = `Analyze the user's problem from the text and potentially an image.
User's text: "${description}"
Tasks:
1. Generate a detailed explanation of the problem IN ENGLISH.
2. Provide comma-separated tags IN ENGLISH (e.g., Water, Infrastructure, Electricity, Health).
Format the entire response as a single JSON object with keys "explanation" and "tags". Do not include any other text or markdown formatting like \`\`\`json.`;

        const contentParts = [{ text: prompt }];
        if (photoPath) {
            try {
                const imageBuffer = fs.readFileSync(photoPath);
                contentParts.push({
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: req.file.mimetype,
                    },
                });
            } catch (readError) {
                console.error("Error reading image file for AI analysis:", readError);
                // Continue without the image if it fails to read
            }
        }

        const result = await model.generateContent({
            contents: [{ parts: contentParts }],
        });

        const responseText = result.response.text();
        console.log("Gemini Raw Response:", responseText);

        // Clean and parse the JSON response from the AI
        const aiResponse = JSON.parse(responseText.trim());

        if (aiResponse.explanation && aiResponse.tags) {
            finalDescription = aiResponse.explanation;
            finalTags = aiResponse.tags;
            console.log('Gemini analysis successful.');
        } else {
            console.warn('AI response did not contain expected "explanation" and "tags" keys. Using original description.');
        }

    } catch (aiError) {
        console.error('Gemini AI analysis failed. Storing original description instead.', aiError);
        // The endpoint will continue and save the original data
    }

    // --- Insert into the database ---
    try {
        const sql = `
            INSERT INTO pendingRequests (villager_id, problem_description, problem_photo, tags) 
            VALUES (?, ?, ?, ?)
        `;
        
        const values = [villagerId, finalDescription, photoPath, finalTags];
        await pool.query(sql, values);
        res.status(201).json({ success: true, message: 'Request submitted successfully!' });

    } catch (dbError) {
        console.error('Database Insert Error:', dbError);
        res.status(500).json({ success: false, message: 'An error occurred while saving the request.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
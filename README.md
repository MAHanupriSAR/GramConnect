# GramConnect

GramConnect is a web platform designed to bridge the gap between rural citizens and local institutions. It allows villagers to report local issues (e.g., infrastructure damage, service disruptions) by submitting requests, which can then be viewed and addressed by registered institutions. The platform leverages AI to analyze and categorize these reports, making them easier to process.

## Features

*   **User Authentication**: Secure registration and login system for villagers.
*   **Request Submission**: Villagers can create new problem requests, providing a text description and an optional photo.
*   **AI-Powered Analysis**:
    *   Integrates with the **Google Gemini API** to analyze user-submitted text and images.
    *   Automatically generates a professional, standardized problem description in English.
    *   Assigns relevant categorical tags (e.g., `Infrastructure`, `Healthcare`, `Electricity`) for easy filtering and routing.
*   **Villager Dashboard**:
    *   A personal dashboard for villagers to track the status of their submitted requests.
    *   Tabs for **Pending**, **Accepted**, and **Solved** requests.
    *   Displays requests in a clean, card-based layout with photos, descriptions, and AI-generated tags.
*   **RESTful API**: A backend built with Node.js and Express that provides endpoints for all user actions, including registration, login, and request management.
*   **File Uploads**: Handles image uploads for problem reports and serves them statically.

## Technology Stack

*   **Backend**: Node.js, Express.js
*   **Database**: MySQL
*   **Frontend**: HTML5, CSS3, Vanilla JavaScript
*   **AI Integration**: Google Gemini API (`@google/generative-ai`)
*   **Key Node.js Libraries**:
    *   `mysql2/promise` for database interaction.
    *   `bcrypt` for password hashing.
    *   `multer` for handling file uploads.
    *   `cors` for cross-origin resource sharing.
    *   `dotenv` for environment variable management.

## Setup and Installation

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd GramConnect
    ```

2.  **Database Setup**:
    *   Ensure you have a MySQL server running.
    *   Execute the `script.sql` file to create the `gramconnect` database and the required tables.
    ```sql
    -- Example using MySQL CLI
    mysql -u your_username -p < script.sql
    ```

3.  **Backend Configuration**:
    *   Install the required Node.js dependencies:
        ```bash
        npm install
        ```
    *   Create a `.env` file in the root directory and add your Google Gemini API key:
        ```
        GEMINI_API_KEY=your_gemini_api_key_here
        ```
    *   Update the database connection details in `server.js` to match your MySQL configuration:
        ```javascript
        const dbConfig = {
            host: 'localhost',
            user: 'your_mysql_username',
            password: 'your_mysql_password',
            database: 'gramconnect',
            charset: 'utf8mb4'
        };
        ```

4.  **Run the Server**:
    *   Start the backend server:
        ```bash
        node server.js
        ```
    *   The server will be running at `http://localhost:3000`.

5.  **Access the Application**:
    *   Open the HTML files from the `HTML/` directory in your web browser to use the application. For example, start with `HTML/home.html`.

## How It Works

1.  A villager registers and logs into the platform.
2.  They navigate to the "Create Request" page.
3.  They fill out a form with a description of the problem and can optionally upload a photo.
4.  Upon submission, the backend sends the text and image to the Gemini API.
5.  Gemini returns a structured JSON object with a standardized `explanation` and a list of `tags`.
6.  The server saves this AI-enhanced data into the `pendingRequests` table in the database.
7.  The villager can view their submitted requests and their status on their dashboard.
